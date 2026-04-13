<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
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
	import QuitSessionModal from '$lib/shared/components/QuitSessionModal.svelte';
	import { forkCategory } from '$lib/sharing/forkService';
	import { installContent, uninstallContent, isInstalled as checkInstalled } from '$lib/sharing/sharingService';
	import { getDueCountByDeck } from '$lib/review/reviewService';
	import {
		quizSession, displayCard, isComplete, progress, summary,
		startQuiz, rateCard, restartWithFailed, resetQuiz
	} from '$lib/viewer/quizStore';
	import type { QuizMode } from '$lib/viewer/quizStore';
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import type { ForkProgress } from '$lib/sharing/forkTypes';
	import type { Rating } from '$lib/viewer/viewerTypes';

	const categoryId = $derived($page.params.categoryId as string);
	const user = getCurrentUser();

	type Screen = 'browse' | 'select' | 'quiz' | 'results';

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
	let viewingCard = $state<Flashcard | null>(null);
	let loading = $state(true);
	let error = $state('');
	let reviewDueCount = $state(0);
	let quizMode = $state<QuizMode>('front-to-back');

	let showForkModal = $state(false);
	let forkRunning = $state(false);
	let forkProgress = $state<ForkProgress | null>(null);
	let forkError = $state<string | null>(null);
	let pendingForkId = $state('');
	let showQuitModal = $state(false);
	let pendingNavHref = $state('');

	const selectedCards = $derived(allCards.filter((c) => selectedIds.has(c.id)));
	const failedCount = $derived($summary.incorrect + $summary.partial);

	beforeNavigate(({ cancel, to }) => {
		if (screen === 'quiz' && to) { cancel(); pendingNavHref = to.url.href; showQuitModal = true; }
	});

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
			if (!authorName && (r.owner as string) === user?.id) authorName = (user?.name as string) || (user?.email as string) || '';
			if (!isOwnContent && user?.id) { const iid = await checkInstalled(categoryId); installId = iid; isInstalled = !!iid; }
			categoryOwnerId = r.owner as string;
			allCards = await listFlashcardsByCategory(categoryId);
			selectedIds = new Set();
			try { reviewDueCount = await getDueCountByDeck(categoryId, 'category'); } catch { /* silent */ }
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load flashcards.'; }
		finally { loading = false; }
	});

	function toggleCard(id: string) { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); selectedIds = next; }
	function selectAll() { selectedIds = new Set(allCards.map((c) => c.id)); }
	function deselectAll() { selectedIds = new Set(); }
	function handleStartQuiz() { startQuiz(selectedCards, quizMode); screen = 'quiz'; }
	function handleRate(rating: Rating) { rateCard(rating); if ($isComplete) screen = 'results'; }
	function handleRetry() { restartWithFailed(); screen = 'quiz'; }
	function handleBackToDeck() { resetQuiz(); screen = 'browse'; }
	function handleQuitQuiz() { showQuitModal = false; resetQuiz(); screen = 'browse'; if (pendingNavHref) { goto(pendingNavHref); pendingNavHref = ''; } }

	async function handleInstall() { installing = true; try { const i = await installContent('flashcard_category', categoryId); installId = i.id; isInstalled = true; } catch (e) { error = e instanceof Error ? e.message : 'Could not install.'; } finally { installing = false; } }
	async function handleUninstall() { if (!installId) return; installing = true; try { await uninstallContent(installId); installId = null; isInstalled = false; } catch (e) { error = e instanceof Error ? e.message : 'Could not remove.'; } finally { installing = false; } }
	async function handleForkConfirm(newTitle: string) { showForkModal = false; forkRunning = true; forkProgress = { step: 0, total: 1, message: 'Starting…' }; forkError = null; pendingForkId = ''; try { pendingForkId = await forkCategory(categoryId, newTitle, (p) => { forkProgress = p; }); } catch (e) { forkError = e instanceof Error ? e.message : 'Fork failed.'; } }
	function handleForkDone() { forkRunning = false; if (pendingForkId) goto(`/viewer/flashcards/category/${pendingForkId}`); }

	const modeLabels: Record<QuizMode, string> = {
		'front-to-back': 'Front → Back',
		'back-to-front': 'Back → Front',
		'mixed': 'Mixed'
	};
</script>

<svelte:head><title>{categoryName || 'Flashcards'} — StudyApp</title></svelte:head>

<FlashcardViewModal flashcard={viewingCard} onClose={() => (viewingCard = null)} />
<ForkModal isOpen={showForkModal} contentType="category" originalTitle={categoryName} originalAuthor={authorName} onConfirm={handleForkConfirm} onClose={() => (showForkModal = false)} />
<ForkProgressModal isOpen={forkRunning} progress={forkProgress} error={forkError} onDone={handleForkDone} />
<QuitSessionModal isOpen={showQuitModal} title="Quit the quiz?" message="Your current quiz progress will be lost." onQuit={handleQuitQuiz} onStay={() => { showQuitModal = false; pendingNavHref = ''; }} />

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
	{:else if allCards.length === 0}
		<EmptyState heading="No flashcards yet" description="This category has no flashcards yet." />

	{:else if screen === 'browse'}
		<div class="flex flex-col gap-1">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 flex-1 min-w-0">
					<h1 class="font-display text-2xl text-[var(--color-text-primary)] truncate">{categoryName}</h1>
					<BookmarkButton contentType="flashcard_category" contentId={categoryId} contentTitle={categoryName} />
				</div>
				<button onclick={() => (screen = 'select')}
					class="shrink-0 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors">
					Start Test
				</button>
			</div>
			{#if authorName}<p class="text-sm text-[var(--color-text-muted)]">by {authorName}</p>{/if}
		</div>

		{#if isShared}<StarRating contentType="flashcard_category" contentId={categoryId} contentOwnerId={categoryOwnerId} readonly={false} showCount={true} />{/if}

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
						<button onclick={() => (showForkModal = true)} class="flex items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">Duplicate</button>
						<button onclick={handleUninstall} disabled={installing} class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] disabled:opacity-50 transition-colors">{installing ? '…' : 'Remove'}</button>
					{:else}
						<button onclick={handleInstall} disabled={installing} class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">{installing ? 'Installing…' : 'Get'}</button>
					{/if}
				</div>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			{#each allCards as card (card.id)}
				<FlashcardListItem flashcard={card} showCheckbox={false} categoryName={categoryName} onClick={(c) => (viewingCard = c)} />
			{/each}
		</div>

		{#if isShared}
			<div class="border-t border-[var(--color-surface-700)] pt-6">
				<CommentSection contentType="flashcard_category" contentId={categoryId} contentOwnerId={categoryOwnerId} isSharedContent={true} />
			</div>
		{/if}

	{:else if screen === 'select'}
		<div class="flex items-center justify-between gap-4">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Set up Test</h1>
			<button onclick={() => { screen = 'browse'; selectedIds = new Set(); }} class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Cancel</button>
		</div>

		<!-- Mode selector -->
		<div class="flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Question side</span>
			<div class="flex gap-2">
				{#each (['front-to-back', 'back-to-front', 'mixed'] as QuizMode[]) as m}
					<button onclick={() => (quizMode = m)}
						class="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors
						       {quizMode === m
							? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
							: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
						{modeLabels[m]}
					</button>
				{/each}
			</div>
			<p class="text-xs text-[var(--color-text-muted)]">Cards are always shuffled randomly.</p>
		</div>

		<!-- Card selector -->
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
			class="w-full rounded-xl bg-[var(--color-accent-500)] py-3 text-sm font-medium
			       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
			       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
			Start Quiz — {modeLabels[quizMode]} ({selectedIds.size} {selectedIds.size === 1 ? 'card' : 'cards'})
		</button>

	{:else if screen === 'quiz'}
		<div class="flex flex-col gap-4 w-full">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-0.5">
					<span class="text-sm text-[var(--color-text-secondary)]">Card {$quizSession.currentIndex + 1} of {$quizSession.cards.length}</span>
					<span class="text-xs text-[var(--color-text-muted)]">{modeLabels[($quizSession as any).mode ?? 'front-to-back']}</span>
				</div>
				<button onclick={() => (showQuitModal = true)} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">Quit Quiz</button>
			</div>
			<div class="h-1.5 w-full rounded-full bg-[var(--color-surface-700)] overflow-hidden">
				<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300" style="width:{$progress}%"></div>
			</div>
			{#if $displayCard}
				<FlipCard
					frontText={$displayCard.frontText}
					frontImageUrl={$displayCard.frontImageUrl}
					frontAudioUrl={$displayCard.frontAudioUrl}
					backText={$displayCard.backText}
					backImageUrl={$displayCard.backImageUrl}
					backAudioUrl={$displayCard.backAudioUrl}
				/>
			{/if}
			<div class="grid grid-cols-3 gap-3">
				<button onclick={() => handleRate('incorrect')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 py-3 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/20 transition-colors"><span class="text-lg">✗</span>Incorrect</button>
				<button onclick={() => handleRate('partial')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10 py-3 text-xs font-medium text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/20 transition-colors"><span class="text-lg">~</span>Partial</button>
				<button onclick={() => handleRate('correct')} class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 py-3 text-xs font-medium text-[var(--color-success-500)] hover:bg-[var(--color-success-500)]/20 transition-colors"><span class="text-lg">✓</span>Correct</button>
			</div>
		</div>

	{:else if screen === 'results'}
		<div class="flex flex-col gap-6 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-8 max-w-xl mx-auto w-full">
			<div class="flex flex-col gap-1 text-center">
				<h2 class="font-display text-2xl text-[var(--color-text-primary)]">Quiz Complete</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{$summary.total} cards studied</p>
			</div>
			<div class="flex h-3 w-full overflow-hidden rounded-full">
				{#if $summary.correct > 0}<div class="bg-[var(--color-success-500)]" style="width:{($summary.correct/$summary.total)*100}%"></div>{/if}
				{#if $summary.partial > 0}<div class="bg-[var(--color-warning-400)]" style="width:{($summary.partial/$summary.total)*100}%"></div>{/if}
				{#if $summary.incorrect > 0}<div class="bg-[var(--color-error-500)]" style="width:{($summary.incorrect/$summary.total)*100}%"></div>{/if}
			</div>
			<div class="grid grid-cols-3 gap-3 text-center">
				<div class="flex flex-col gap-0.5"><span class="text-xl font-semibold text-[var(--color-success-500)]">{$summary.correct}</span><span class="text-xs text-[var(--color-text-muted)]">Correct</span></div>
				<div class="flex flex-col gap-0.5"><span class="text-xl font-semibold text-[var(--color-warning-400)]">{$summary.partial}</span><span class="text-xs text-[var(--color-text-muted)]">Partial</span></div>
				<div class="flex flex-col gap-0.5"><span class="text-xl font-semibold text-[var(--color-error-400)]">{$summary.incorrect}</span><span class="text-xs text-[var(--color-text-muted)]">Incorrect</span></div>
			</div>
			<div class="flex flex-col gap-3">
				<button onclick={handleRetry} disabled={failedCount===0} class="w-full rounded-xl bg-[var(--color-accent-500)] py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] disabled:opacity-40 transition-colors">Retry Incorrect + Partial ({failedCount})</button>
				<button onclick={handleBackToDeck} class="w-full rounded-xl border border-[var(--color-surface-600)] py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Back to Deck</button>
			</div>
		</div>
	{/if}
</div>
