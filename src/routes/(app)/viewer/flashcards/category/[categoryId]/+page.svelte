<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/shared/pocketbase';
	import { getCurrentUser } from '$lib/auth/authService';
	import { listFlashcardsByCategory } from '$lib/viewer/viewerService';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';
	import FlashcardListItem from '$lib/viewer/components/FlashcardListItem.svelte';
	import FlashcardViewModal from '$lib/viewer/components/FlashcardViewModal.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';
	import StarRating from '$lib/shared/components/StarRating.svelte';
	import CommentSection from '$lib/social/components/CommentSection.svelte';
	import ForkModal from '$lib/shared/components/ForkModal.svelte';
	import ForkProgressModal from '$lib/shared/components/ForkProgressModal.svelte';
	import { forkCategory } from '$lib/sharing/forkService';
	import { installContent, uninstallContent, isInstalled as checkInstalled } from '$lib/sharing/sharingService';
	import { getDueCountByDeck } from '$lib/review/reviewService';
	import {
		quizSession, currentCard, isComplete, progress, summary,
		startQuiz, rateCard, restartWithFailed, resetQuiz
	} from '$lib/viewer/quizStore';
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import type { ForkProgress } from '$lib/sharing/forkTypes';
	import type { Rating } from '$lib/viewer/viewerTypes';

	// Support both /viewer/flashcards/[categoryId] and /viewer/flashcards/category/[categoryId]
	const categoryId = $derived(($page.params.categoryId ?? $page.params.id) as string);
	const user = getCurrentUser();

	type Screen = 'browse' | 'select' | 'quiz' | 'results';
	type QuizMode = 'front-to-back' | 'back-to-front' | 'mixed';

	let categoryName = $state('');
	let authorName = $state('');
	let isInstalled = $state(false);
	let isOwnContent = $state(true);
	let installId = $state<string | null>(null);
	let installing = $state(false);
	let categoryOwnerId = $state('');
	let isShared = $state(false);
	let allCards = $state<Flashcard[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let screen = $state<Screen>('browse');
	let quizMode = $state<QuizMode>('front-to-back');
	let viewingCard = $state<Flashcard | null>(null);
	let loading = $state(true);
	let error = $state('');
	let reviewDueCount = $state(0);
	let showForkModal = $state(false);
	let forkRunning = $state(false);
	let forkProgress = $state<ForkProgress | null>(null);
	let forkError = $state<string | null>(null);
	let pendingForkId = $state('');

	// Quiz with mode support: swap front/back based on mode, shuffle
	interface QuizCard { id: string; front: string; frontImg: string; frontAudio: string; back: string; backImg: string; backAudio: string; }
	let quizCards = $state<QuizCard[]>([]);
	let quizIndex = $state(0);
	let quizFlipped = $state(false);
	let quizResults = $state<Array<{ id: string; rating: Rating }>>([]);

	const selectedCards = $derived(allCards.filter((c) => selectedIds.has(c.id)));
	const failedCount = $derived($summary.incorrect + $summary.partial);

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function buildQuizCards(cards: Flashcard[], mode: QuizMode): QuizCard[] {
		const shuffled = shuffle(cards);
		return shuffled.map((c) => {
			const flip = mode === 'back-to-front' || (mode === 'mixed' && Math.random() > 0.5);
			return {
				id: c.id,
				front: flip ? c.backText : c.frontText,
				frontImg: flip ? c.backImageUrl : c.frontImageUrl,
				frontAudio: flip ? c.backAudioUrl : c.frontAudioUrl,
				back: flip ? c.frontText : c.backText,
				backImg: flip ? c.frontImageUrl : c.backImageUrl,
				backAudio: flip ? c.frontAudioUrl : c.backAudioUrl,
			};
		});
	}

	function handleStartQuiz() {
		quizCards = buildQuizCards(selectedCards, quizMode);
		quizIndex = 0; quizFlipped = false; quizResults = [];
		screen = 'quiz';
	}

	function handleRate(rating: Rating) {
		const card = quizCards[quizIndex];
		quizResults = [...quizResults, { id: card.id, rating }];
		if (rating !== 'correct') {
			// Push to end of remaining queue
			const remaining = quizCards.slice(quizIndex + 1);
			const failed = quizCards[quizIndex];
			quizCards = [...remaining, failed];
			quizFlipped = false;
			// quizIndex stays the same (next card slides into position)
		} else {
			quizIndex++;
			quizFlipped = false;
		}
		if (quizIndex >= quizCards.length) { screen = 'results'; }
	}

	function handleRetry() {
		const failedIds = new Set(quizResults.filter((r) => r.rating !== 'correct').map((r) => r.id));
		const failedCards = allCards.filter((c) => failedIds.has(c.id));
		quizCards = buildQuizCards(failedCards, quizMode);
		quizIndex = 0; quizFlipped = false; quizResults = [];
		screen = 'quiz';
	}

	function handleBackToDeck() { screen = 'browse'; quizResults = []; }

	const quizTotal = $derived(new Set(quizResults.map((r) => r.id)).size + (quizCards.length - quizIndex));
	const quizCorrect = $derived(quizResults.filter((r) => r.rating === 'correct').length);
	const quizPartial = $derived(quizResults.filter((r) => r.rating === 'partial').length);
	const quizIncorrect = $derived(quizResults.filter((r) => r.rating === 'incorrect').length);
	// Unique cards done = correct ones (removed from queue)
	const uniqueDone = $derived(new Set(quizResults.filter((r) => r.rating === 'correct').map((r) => r.id)).size);
	const quizProgress = $derived(selectedCards.length > 0 ? (uniqueDone / selectedCards.length) * 100 : 0);

	onMount(async () => {
		loading = true; resetQuiz();
		try {
			const r = await pb.collection('flashcard_categories').getOne(categoryId, { requestKey: null });
			categoryName = r.name as string;
			isShared = !!(r.isShared as boolean);
			try {
				const u = await pb.collection('users').getOne(r.owner as string, { requestKey: null });
				authorName = (u.name as string) || (u.email as string) || '';
			} catch { authorName = ''; }
			const isFork = !!(r.forkedFrom as string);
			isOwnContent = (r.owner as string) === user?.id || isFork;
			if (!authorName && (r.owner as string) === user?.id) {
				authorName = (user?.name as string) || (user?.email as string) || '';
			}
			if (!isOwnContent && user?.id) {
				const iid = await checkInstalled(categoryId);
				installId = iid; isInstalled = !!iid;
			}
			categoryOwnerId = r.owner as string;
			allCards = await listFlashcardsByCategory(categoryId);
			selectedIds = new Set();
			try { reviewDueCount = await getDueCountByDeck(categoryId, 'category'); } catch { /* silent */ }
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load flashcards.';
		} finally { loading = false; }
	});

	function toggleCard(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		selectedIds = next;
	}
	function selectAll() { selectedIds = new Set(allCards.map((c) => c.id)); }
	function deselectAll() { selectedIds = new Set(); }

	async function handleInstall() {
		installing = true;
		try { const i = await installContent('flashcard_category', categoryId); installId = i.id; isInstalled = true; }
		catch (e) { error = e instanceof Error ? e.message : 'Could not install.'; }
		finally { installing = false; }
	}
	async function handleUninstall() {
		if (!installId) return; installing = true;
		try { await uninstallContent(installId); installId = null; isInstalled = false; }
		catch (e) { error = e instanceof Error ? e.message : 'Could not remove.'; }
		finally { installing = false; }
	}
	async function handleForkConfirm(newTitle: string) {
		showForkModal = false; forkRunning = true;
		forkProgress = { step: 0, total: 1, message: 'Starting…' };
		forkError = null; pendingForkId = '';
		try { pendingForkId = await forkCategory(categoryId, newTitle, (p) => { forkProgress = p; }); }
		catch (e) { forkError = e instanceof Error ? e.message : 'Fork failed.'; }
	}
	function handleForkDone() {
		forkRunning = false;
		if (pendingForkId) goto(`/viewer/flashcards/category/${pendingForkId}`);
	}
</script>

<svelte:head><title>{categoryName || 'Flashcards'} — StudyApp</title></svelte:head>

<FlashcardViewModal flashcard={viewingCard} onClose={() => (viewingCard = null)} />
<ForkModal isOpen={showForkModal} contentType="category" originalTitle={categoryName} originalAuthor={authorName} onConfirm={handleForkConfirm} onClose={() => (showForkModal = false)} />
<ForkProgressModal isOpen={forkRunning} progress={forkProgress} error={forkError} onDone={handleForkDone} />

<div class="flex flex-col gap-6 max-w-2xl">
	<nav class="flex items-center gap-2 text-sm flex-wrap">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<a href="/viewer/flashcards" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Flashcards</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">{categoryName || '…'}</span>
	</nav>

	{#if loading}
		<div class="h-32 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
	{:else if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{:else if screen === 'browse'}
		<div class="flex flex-col gap-1">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 flex-1 min-w-0">
					<h1 class="font-display text-2xl text-[var(--color-text-primary)] truncate">{categoryName}</h1>
					<BookmarkButton contentType="flashcard_category" contentId={categoryId} contentTitle={categoryName} />
				</div>
				{#if allCards.length > 0}
					<button onclick={() => (screen = 'select')}
						class="shrink-0 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors">
						Start Test
					</button>
				{/if}
			</div>
			{#if authorName}<p class="text-sm text-[var(--color-text-muted)]">by {authorName}</p>{/if}
		</div>

		{#if isShared}
			<StarRating contentType="flashcard_category" contentId={categoryId} contentOwnerId={categoryOwnerId} readonly={false} showCount={true} />
		{/if}

		{#if reviewDueCount > 0}
			<div class="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/5 px-4 py-3">
				<p class="text-sm text-[var(--color-text-secondary)]"><span class="font-medium text-[var(--color-warning-400)]">{reviewDueCount}</span> {reviewDueCount === 1 ? 'card' : 'cards'} due for review</p>
				<a href="/review" class="shrink-0 rounded-xl border border-[var(--color-warning-500)]/50 px-3 py-1.5 text-xs font-medium text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/10 transition-colors">Review now</a>
			</div>
		{/if}

		{#if !isOwnContent}
			<div class="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<p class="text-sm font-medium text-[var(--color-text-secondary)]">{isInstalled ? 'Installed — duplicate to edit or export' : 'Add this to your library'}</p>
				<div class="flex shrink-0 items-center gap-2">
					{#if isInstalled}
						<button onclick={() => (showForkModal = true)} class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v4M6 17v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
							Duplicate
						</button>
						<button onclick={handleUninstall} disabled={installing} class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] disabled:opacity-50 transition-colors">{installing ? '…' : 'Remove'}</button>
					{:else}
						<button onclick={handleInstall} disabled={installing} class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">{installing ? 'Installing…' : 'Get'}</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if allCards.length === 0}
			<EmptyState heading="No flashcards yet" description="This category has no flashcards yet." />
		{:else}
			<div class="flex flex-col gap-2">
				{#each allCards as card (card.id)}
					<FlashcardListItem flashcard={card} showCheckbox={false} categoryName={categoryName} onClick={(c) => (viewingCard = c)} />
				{/each}
			</div>
		{/if}

		{#if isShared}
			<div class="border-t border-[var(--color-surface-700)] pt-6">
				<CommentSection contentType="flashcard_category" contentId={categoryId} contentOwnerId={categoryOwnerId} isSharedContent={true} />
			</div>
		{/if}

	{:else if screen === 'select'}
		<!-- Mode selector + card selection -->
		<div class="flex items-center justify-between gap-4">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Set Up Test</h1>
			<button onclick={() => { screen = 'browse'; selectedIds = new Set(); }} class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Cancel</button>
		</div>

		<!-- Question mode -->
		<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Question Side</span>
			<div class="flex gap-2">
				{#each ([['front-to-back','Front → Back'],['back-to-front','Back → Front'],['mixed','Mixed']] as [QuizMode, string][]) as [mode, label]}
					<button onclick={() => (quizMode = mode)}
						class="flex-1 rounded-xl border py-2 text-sm font-medium transition-colors
						       {quizMode === mode ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]' : 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
						{label}
					</button>
				{/each}
			</div>
			<p class="text-xs text-[var(--color-text-muted)]">Cards are always shuffled randomly.</p>
		</div>

		<div class="flex items-center gap-3">
			<button onclick={selectAll} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Select all</button>
			<span class="text-[var(--color-text-muted)]">·</span>
			<button onclick={deselectAll} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Deselect all</button>
			<span class="ml-auto text-xs text-[var(--color-text-muted)]">{selectedIds.size} selected</span>
		</div>
		<div class="flex flex-col gap-2">
			{#each allCards as card (card.id)}
				<FlashcardListItem flashcard={card} showCheckbox={true} selected={selectedIds.has(card.id)} onToggle={toggleCard} />
			{/each}
		</div>
		<button onclick={handleStartQuiz} disabled={selectedIds.size === 0}
			class="w-full rounded-xl bg-[var(--color-accent-500)] py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
			Start Quiz — {selectedIds.size} {selectedIds.size === 1 ? 'card' : 'cards'} · {quizMode === 'front-to-back' ? 'Front → Back' : quizMode === 'back-to-front' ? 'Back → Front' : 'Mixed'}
		</button>

	{:else if screen === 'quiz'}
		{@const card = quizCards[quizIndex]}
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-0.5">
					<span class="text-sm font-medium text-[var(--color-text-primary)]">{categoryName}</span>
					<span class="text-xs text-[var(--color-text-muted)]">
						{uniqueDone} of {selectedCards.length} mastered
						{#if quizMode === 'back-to-front'} · Back → Front{:else if quizMode === 'mixed'} · Mixed{/if}
					</span>
				</div>
				<button onclick={handleBackToDeck} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">Quit</button>
			</div>

			<!-- Progress bar -->
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
				<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300" style="width:{quizProgress}%"></div>
			</div>

			{#if card}
				<!-- Flip card -->
				<div style="perspective:1000px; height:260px; width:100%;">
					<button onclick={() => (quizFlipped = !quizFlipped)}
						class="relative w-full h-full cursor-pointer"
						aria-label="Flip card"
						style="transform-style:preserve-3d; transition:transform 0.5s; transform:{quizFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}">
						<!-- Front -->
						<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] p-5 overflow-hidden"
						     style="backface-visibility:hidden; -webkit-backface-visibility:hidden;">
							<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Question</span>
							<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
								<p class="text-base text-center text-[var(--color-text-primary)] leading-relaxed">{card.front}</p>
								{#if card.frontImg}<img src={card.frontImg} alt="" class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />{/if}
							</div>
							<p class="shrink-0 text-center text-xs text-[var(--color-text-muted)] mt-2">Tap to reveal answer</p>
						</div>
						<!-- Back -->
						<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-accent-500)]/30 bg-[var(--color-surface-800)] p-5 overflow-hidden"
						     style="backface-visibility:hidden; -webkit-backface-visibility:hidden; transform:rotateY(180deg);">
							<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Answer</span>
							<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
								<p class="text-base text-center text-[var(--color-text-primary)] leading-relaxed">{card.back}</p>
								{#if card.backImg}<img src={card.backImg} alt="" class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />{/if}
							</div>
						</div>
					</button>
				</div>

				{#if !quizFlipped}
					<p class="text-center text-sm text-[var(--color-text-muted)]">Tap the card to see the answer</p>
				{:else}
					<div class="grid grid-cols-3 gap-3">
						<button onclick={() => handleRate('incorrect')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 py-3 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/20 transition-colors"><span class="text-xl">✗</span>Didn't know</button>
						<button onclick={() => handleRate('partial')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10 py-3 text-xs font-medium text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/20 transition-colors"><span class="text-xl">~</span>Almost</button>
						<button onclick={() => handleRate('correct')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 py-3 text-xs font-medium text-[var(--color-success-500)] hover:bg-[var(--color-success-500)]/20 transition-colors"><span class="text-xl">✓</span>Got it</button>
					</div>
					<p class="text-center text-xs text-[var(--color-text-muted)]">Wrong / Almost cards repeat until you get them ✓</p>
				{/if}
			{/if}
		</div>

	{:else if screen === 'results'}
		<div class="flex flex-col gap-6 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-8 max-w-xl mx-auto w-full">
			<div class="flex flex-col items-center gap-2 text-center">
				<span class="text-4xl">🎉</span>
				<h2 class="font-display text-2xl text-[var(--color-text-primary)]">Test Complete!</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{selectedCards.length} cards studied</p>
			</div>
			<div class="flex h-3 w-full overflow-hidden rounded-full">
				{#if quizCorrect > 0}<div class="bg-[var(--color-success-500)]" style="width:{(quizCorrect/quizResults.length)*100}%"></div>{/if}
				{#if quizPartial > 0}<div class="bg-[var(--color-warning-400)]" style="width:{(quizPartial/quizResults.length)*100}%"></div>{/if}
				{#if quizIncorrect > 0}<div class="bg-[var(--color-error-500)]" style="width:{(quizIncorrect/quizResults.length)*100}%"></div>{/if}
			</div>
			<div class="grid grid-cols-3 gap-3 text-center">
				<div class="flex flex-col gap-0.5 rounded-xl bg-[var(--color-success-500)]/10 py-3"><span class="text-2xl font-semibold text-[var(--color-success-500)]">{quizCorrect}</span><span class="text-xs text-[var(--color-text-muted)]">Got it</span></div>
				<div class="flex flex-col gap-0.5 rounded-xl bg-[var(--color-warning-400)]/10 py-3"><span class="text-2xl font-semibold text-[var(--color-warning-400)]">{quizPartial}</span><span class="text-xs text-[var(--color-text-muted)]">Almost</span></div>
				<div class="flex flex-col gap-0.5 rounded-xl bg-[var(--color-error-500)]/10 py-3"><span class="text-2xl font-semibold text-[var(--color-error-400)]">{quizIncorrect}</span><span class="text-xs text-[var(--color-text-muted)]">Missed</span></div>
			</div>
			<div class="flex flex-col gap-2">
				{#if quizIncorrect + quizPartial > 0}
					<button onclick={handleRetry} class="w-full rounded-xl bg-[var(--color-accent-500)] py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors">
						Retry missed cards ({quizIncorrect + quizPartial})
					</button>
				{/if}
				<button onclick={handleBackToDeck} class="w-full rounded-xl border border-[var(--color-surface-600)] py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Back to Deck</button>
			</div>
		</div>
	{/if}
</div>
