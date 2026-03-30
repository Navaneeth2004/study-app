<script lang="ts">
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/auth/authService';
	import {
		getReviewSettings, getDueCount,
		getReviewStats, getAllDecksWithDueCount, getTodayReviews,
		getDueCards, getDueCardsByDeck, getNewCards, getNewCardsByDeck,
		getNewCardCount, getNewCardsIntroducedToday
	} from '$lib/review/reviewService';
	import {
		reviewSession, currentCard, reviewProgress, reviewSummary,
		startSession, rateCard, endSession, resetSession
	} from '$lib/review/reviewSessionStore';
	import type { ReviewSettings, ReviewStats, DeckReviewSummary } from '$lib/review/reviewTypes';
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import { pb } from '$lib/shared/pocketbase';

	const user = getCurrentUser();
	type Tab = 'today' | 'decks' | 'stats';

	let activeTab = $state<Tab>('today');
	let settings = $state<ReviewSettings | null>(null);
	let stats = $state<ReviewStats | null>(null);
	let deckSummary = $state<DeckReviewSummary | null>(null);
	let loading = $state(true);
	let error = $state('');
	let sessionActive = $state(false);
	let sessionLoading = $state(false);
	let rating = $state(false);
	let cardFlipped = $state(false);
	let expandedTextbooks = $state<Set<string>>(new Set());
	let todayReviews = $state<Array<{ rating: string }>>([]);
	let totalNewAvailable = $state(0);
	let weeklyData = $state<Array<{ date: string; correct: number; partial: number; incorrect: number }>>([]);

	onMount(async () => {
		loading = true;
		try {
			const [s, st, ds, tr, nnc, nit] = await Promise.all([
				getReviewSettings(), getReviewStats(), getAllDecksWithDueCount(),
				getTodayReviews(), getNewCardCount(), getNewCardsIntroducedToday()
			]);
			settings = s; stats = st; deckSummary = ds; todayReviews = tr;
			totalNewAvailable = nnc;
			await loadWeeklyData();
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load review data.'; }
		finally { loading = false; }
	});

	async function loadWeeklyData() {
		const uid = pb.authStore.record?.id ?? '';
		try {
			const days: Array<{ date: string; correct: number; partial: number; incorrect: number }> = [];
			for (let i = 6; i >= 0; i--) {
				const d = new Date(); d.setDate(d.getDate() - i);
				const dateStr = d.toISOString().slice(0, 10);
				const records = await pb.collection('card_reviews').getFullList({
					requestKey: null,
					filter: `user = "${uid}" && reviewedAt >= "${dateStr}T00:00:00.000Z" && reviewedAt < "${dateStr}T23:59:59.999Z"`,
					fields: 'rating'
				});
				days.push({
					date: dateStr,
					correct: records.filter((r) => r.rating === 'correct').length,
					partial: records.filter((r) => r.rating === 'partial').length,
					incorrect: records.filter((r) => r.rating === 'incorrect').length
				});
			}
			weeklyData = days;
		} catch { /* silent */ }
	}

	async function startReview() {
		error = ''; sessionLoading = true;
		try {
			const dueSchedules = await getDueCards();
			if (dueSchedules.length === 0) {
				// Fall back to all scheduled cards when nothing is due
				const uid = pb.authStore.record?.id ?? '';
				const allScheduled = await pb.collection('card_schedules').getFullList({
					requestKey: null, filter: `user = "${uid}"`, fields: 'flashcard'
				});
				if (allScheduled.length === 0) {
					error = 'No cards to review yet. Add flashcards first.';
					sessionLoading = false; return;
				}
				const cards = await fetchFlashcardsByIds(allScheduled.map((s) => s.flashcard as string));
				startSession(cards); sessionActive = true; cardFlipped = false; return;
			}
			const cards = await fetchFlashcardsByIds(dueSchedules.map((s) => s.flashcard));
			startSession(cards); sessionActive = true; cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start review.'; }
		finally { sessionLoading = false; }
	}

	async function startDeckReview(deckId: string, deckType: 'chapter' | 'category') {
		error = ''; sessionLoading = true;
		try {
			const dueSchedules = await getDueCardsByDeck(deckId, deckType);
			if (dueSchedules.length === 0) { sessionLoading = false; return; }
			const cards = await fetchFlashcardsByIds(dueSchedules.map((s) => s.flashcard));
			startSession(cards); sessionActive = true; cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start review.'; }
		finally { sessionLoading = false; }
	}

	async function startNewCards() {
		if (!settings) return;
		error = ''; sessionLoading = true;
		try {
			const remaining = Math.max(0, settings.dailyNewCardLimit - (stats?.newCardsToday ?? 0));
			if (remaining <= 0) { error = 'Daily new card limit reached. Come back tomorrow!'; sessionLoading = false; return; }
			const newCardIds = await getNewCards(remaining);
			if (newCardIds.length === 0) { error = 'No new cards available — all your cards are already scheduled.'; sessionLoading = false; return; }
			const cards = await fetchFlashcardsByIds(newCardIds);
			startSession(cards); sessionActive = true; cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startDeckNew(deckId: string, deckType: 'chapter' | 'category') {
		if (!settings) return;
		error = ''; sessionLoading = true;
		try {
			const newCardIds = await getNewCardsByDeck(deckId, deckType, settings.dailyNewCardLimit);
			if (newCardIds.length === 0) { sessionLoading = false; return; }
			const cards = await fetchFlashcardsByIds(newCardIds);
			startSession(cards); sessionActive = true; cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function fetchFlashcardsByIds(ids: string[]): Promise<Flashcard[]> {
		if (ids.length === 0) return [];
		const filter = '(' + ids.map((id) => `id = "${id}"`).join(' || ') + ')';
		const records = await pb.collection('flashcards').getFullList({ requestKey: null, filter });
		return records.map((r) => ({
			id: r.id as string, owner: r.owner as string,
			frontText: r.front_text as string,
			frontImageUrl: r.front_image ? pb.files.getURL(r, r.front_image as string) : '',
			frontAudioUrl: r.front_audio ? pb.files.getURL(r, r.front_audio as string) : '',
			backText: r.back_text as string,
			backImageUrl: r.back_image ? pb.files.getURL(r, r.back_image as string) : '',
			backAudioUrl: r.back_audio ? pb.files.getURL(r, r.back_audio as string) : '',
			chapter: (r.chapter as string) ?? '', category: (r.category as string) ?? '',
			order: r.order as number, created: r.created as string, updated: r.updated as string
		}));
	}

	async function handleRate(r: 'correct' | 'partial' | 'incorrect') {
		rating = true;
		try { await rateCard(r); cardFlipped = false; }
		finally { rating = false; }
	}

	async function handleBackToReview() {
		resetSession(); sessionActive = false; error = ''; loading = true;
		try {
			const [s, st, ds, tr, nnc] = await Promise.all([
				getReviewSettings(), getReviewStats(), getAllDecksWithDueCount(), getTodayReviews(), getNewCardCount()
			]);
			settings = s; stats = st; deckSummary = ds; todayReviews = tr; totalNewAvailable = nnc;
			await loadWeeklyData();
		} catch { /* silent */ } finally { loading = false; }
	}

	function toggleTextbook(id: string) {
		const next = new Set(expandedTextbooks);
		if (next.has(id)) next.delete(id); else next.add(id);
		expandedTextbooks = next;
	}

	function greeting() {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning'; if (h < 18) return 'Good afternoon'; return 'Good evening';
	}

	const maxBarHeight = $derived(weeklyData.reduce((max, d) => Math.max(max, d.correct + d.partial + d.incorrect), 1));
	const todayCorrect = $derived(todayReviews.filter((r) => r.rating === 'correct').length);
	const todayPartial = $derived(todayReviews.filter((r) => r.rating === 'partial').length);
	const todayIncorrect = $derived(todayReviews.filter((r) => r.rating === 'incorrect').length);
	const todayTotal = $derived(todayReviews.length);
	const chartYLabels = $derived([maxBarHeight, Math.round(maxBarHeight / 2), 0]);
</script>

<svelte:head><title>Review — StudyApp</title></svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">

{#if sessionActive && !$reviewSession.isComplete}
<!-- ── SESSION ACTIVE ─────────────────────────────────────────────── -->
<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-0.5">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Review</h1>
			<span class="text-sm text-[var(--color-text-secondary)]">
				{$reviewSession.queue.length} card{$reviewSession.queue.length !== 1 ? 's' : ''} remaining · wrong cards repeat until correct
			</span>
		</div>
		<button onclick={() => endSession()}
			class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] transition-colors">
			End
		</button>
	</div>

	<!-- Progress bar shows unique cards mastered / total -->
	<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
		<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300" style="width:{$reviewProgress}%"></div>
	</div>

	{#if $currentCard}
		<!-- Card -->
		<div style="perspective: 1000px; height: 260px; width: 100%;">
			<button onclick={() => (cardFlipped = true)} class="relative w-full h-full cursor-pointer"
				aria-label="Flip card"
				style="transform-style: preserve-3d; transition: transform 0.5s; transform: {cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}">
				<!-- Front -->
				<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] p-5 overflow-hidden"
				     style="backface-visibility: hidden; -webkit-backface-visibility: hidden;">
					<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Front</span>
					<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
						<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{$currentCard.frontText}</p>
						{#if $currentCard.frontImageUrl}
							<img src={$currentCard.frontImageUrl} alt="Front" class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />
						{/if}
					</div>
					<p class="shrink-0 text-center text-xs text-[var(--color-text-muted)] mt-2">Click to flip</p>
				</div>
				<!-- Back -->
				<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-accent-500)]/30 bg-[var(--color-surface-800)] p-5 overflow-hidden"
				     style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);">
					<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Back</span>
					<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
						<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{$currentCard.backText}</p>
						{#if $currentCard.backImageUrl}
							<img src={$currentCard.backImageUrl} alt="Back" class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />
						{/if}
					</div>
				</div>
			</button>
		</div>

		{#if !cardFlipped}
			<p class="text-center text-sm text-[var(--color-text-muted)]">Click the card to reveal the answer</p>
		{:else}
			<!-- Hint: only correct removes the card from queue -->
			<div class="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
				✗ / ~ → card repeats &nbsp;·&nbsp; ✓ → card removed from queue
			</div>
			<div class="grid grid-cols-3 gap-3">
				<button onclick={() => handleRate('incorrect')} disabled={rating}
					class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 py-3 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/20 disabled:opacity-50 transition-colors">
					<span class="text-lg">✗</span>Incorrect
				</button>
				<button onclick={() => handleRate('partial')} disabled={rating}
					class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10 py-3 text-xs font-medium text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/20 disabled:opacity-50 transition-colors">
					<span class="text-lg">~</span>Partial
				</button>
				<button onclick={() => handleRate('correct')} disabled={rating}
					class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 py-3 text-xs font-medium text-[var(--color-success-500)] hover:bg-[var(--color-success-500)]/20 disabled:opacity-50 transition-colors">
					<span class="text-lg">✓</span>Correct
				</button>
			</div>
		{/if}
	{/if}
</div>

{:else if sessionActive && $reviewSession.isComplete}
<!-- ── SESSION COMPLETE ─────────────────────────────────────────── -->
<div class="flex flex-col gap-6 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-8 max-w-xl">
	<div class="flex flex-col items-center gap-2 text-center">
		<span class="text-3xl">🎉</span>
		<h2 class="font-display text-2xl text-[var(--color-text-primary)]">Review Complete!</h2>
		<p class="text-sm text-[var(--color-text-secondary)]">
			You got all {$reviewSummary.masteredCount} card{$reviewSummary.masteredCount !== 1 ? 's' : ''} correct — {$reviewSummary.total} total answers
		</p>
	</div>

	{#if $reviewSummary.total > 0}
		<div class="flex h-3 w-full overflow-hidden rounded-full">
			{#if $reviewSummary.correct > 0}<div class="bg-[var(--color-success-500)]" style="width:{($reviewSummary.correct/$reviewSummary.total)*100}%"></div>{/if}
			{#if $reviewSummary.partial > 0}<div class="bg-[var(--color-warning-400)]" style="width:{($reviewSummary.partial/$reviewSummary.total)*100}%"></div>{/if}
			{#if $reviewSummary.incorrect > 0}<div class="bg-[var(--color-error-500)]" style="width:{($reviewSummary.incorrect/$reviewSummary.total)*100}%"></div>{/if}
		</div>
	{/if}

	<div class="grid grid-cols-3 gap-3 text-center">
		<div class="flex flex-col gap-0.5">
			<span class="text-xl font-semibold text-[var(--color-success-500)]">{$reviewSummary.correct}</span>
			<span class="text-xs text-[var(--color-text-muted)]">Correct</span>
		</div>
		<div class="flex flex-col gap-0.5">
			<span class="text-xl font-semibold text-[var(--color-warning-400)]">{$reviewSummary.partial}</span>
			<span class="text-xs text-[var(--color-text-muted)]">Partial</span>
		</div>
		<div class="flex flex-col gap-0.5">
			<span class="text-xl font-semibold text-[var(--color-error-400)]">{$reviewSummary.incorrect}</span>
			<span class="text-xs text-[var(--color-text-muted)]">Incorrect</span>
		</div>
	</div>

	<!-- SM-2 info -->
	<div class="rounded-xl border border-[var(--color-accent-500)]/20 bg-[var(--color-accent-500)]/5 px-4 py-3">
		<p class="text-xs text-[var(--color-accent-400)]">
			<strong>Only correct answers</strong> were scheduled with SM-2. Wrong and partial answers were not penalised — those cards will appear again in your next session.
		</p>
	</div>

	<button onclick={handleBackToReview}
		class="w-full rounded-xl bg-[var(--color-accent-500)] py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
		Back to Review
	</button>
</div>

{:else}
<!-- ── DASHBOARD ────────────────────────────────────────────────── -->
<div class="flex flex-col gap-1">
	<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Review</h1>
	<p class="text-[var(--color-text-secondary)]">Wrong cards repeat until you get them right. Only correct answers get scheduled.</p>
</div>

<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
	{#each (['today', 'decks', 'stats'] as Tab[]) as tab}
		<button onclick={() => (activeTab = tab)}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors
			       {activeTab === tab ? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
			{tab}
		</button>
	{/each}
</div>

{#if loading}
	<div class="flex flex-col gap-3">{#each Array(3) as _}<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>{/each}</div>

{:else if activeTab === 'today' && settings && stats}
<div class="flex flex-col gap-5">
	<p class="text-base text-[var(--color-text-secondary)]">{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</p>

	{#if error}
		<div class="flex items-center gap-3 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/5 px-4 py-3">
			<p class="flex-1 text-sm text-[var(--color-text-secondary)]">{error}</p>
			<button onclick={() => (error = '')} class="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="Dismiss">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
		</div>
	{/if}

	<div class="grid grid-cols-3 gap-3">
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Due Today</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.dueToday}</span>
		</div>
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Reviewed</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.reviewedToday}</span>
		</div>
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">New Today</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.newCardsToday}<span class="text-sm text-[var(--color-text-muted)]">/{settings.dailyNewCardLimit}</span></span>
		</div>
	</div>

	{#if stats.dueToday > 0}
		<div class="flex flex-col gap-3">
			<button onclick={startReview} disabled={sessionLoading}
				class="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
				{sessionLoading ? 'Loading…' : `Start Review (${stats.dueToday} due)`}
			</button>
			{#if deckSummary?.textbooks.some((tb) => tb.chapters.some((ch) => ch.dueCount > 0))}
				<div class="flex flex-col gap-1">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">By Chapter</span>
					{#each deckSummary.textbooks.filter((tb) => tb.chapters.some((ch) => ch.dueCount > 0)) as tb}
						{#each tb.chapters.filter((ch) => ch.dueCount > 0) as ch}
							<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{ch.chapterTitle}</p>
									<p class="text-xs text-[var(--color-text-muted)] truncate">{tb.textbookTitle}</p>
								</div>
								<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{ch.dueCount}</span>
								<button onclick={() => startDeckReview(ch.chapterId, 'chapter')} disabled={sessionLoading}
									class="shrink-0 rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">
									Review
								</button>
							</div>
						{/each}
					{/each}
				</div>
			{/if}
			{#if deckSummary?.soloDecks.some((d) => d.dueCount > 0)}
				<div class="flex flex-col gap-1">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">Solo Decks</span>
					{#each deckSummary.soloDecks.filter((d) => d.dueCount > 0) as deck}
						<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
							<p class="flex-1 min-w-0 text-sm font-medium text-[var(--color-text-primary)] truncate">{deck.categoryName}</p>
							<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{deck.dueCount}</span>
							<button onclick={() => startDeckReview(deck.categoryId, 'category')} disabled={sessionLoading}
								class="shrink-0 rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">
								Review
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/5 p-4">
			<div class="flex items-center gap-2">
				<span class="text-xl">✅</span>
				<p class="text-sm font-medium text-[var(--color-success-500)]">All caught up! Nothing due right now.</p>
			</div>
			<p class="text-xs text-[var(--color-text-muted)]">Cards reviewed today were rescheduled. Come back tomorrow!</p>
		</div>
	{/if}

	<!-- New cards -->
	<div class="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-medium text-[var(--color-text-primary)]">Introduce New Cards</span>
			<span class="text-xs text-[var(--color-text-muted)]">
				{#if stats.newCardsToday >= settings.dailyNewCardLimit}Daily limit reached ({settings.dailyNewCardLimit} new cards)
				{:else if totalNewAvailable === 0}No new cards available
				{:else}{settings.dailyNewCardLimit - stats.newCardsToday} remaining today · {totalNewAvailable} unscheduled{/if}
			</span>
		</div>
		<button onclick={startNewCards}
			disabled={sessionLoading || stats.newCardsToday >= settings.dailyNewCardLimit || totalNewAvailable === 0}
			class="shrink-0 rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
			{sessionLoading ? '…' : 'Study new cards'}
		</button>
	</div>
</div>

{:else if activeTab === 'decks' && deckSummary}
<div class="flex flex-col gap-6">
	{#if deckSummary.textbooks.length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Textbooks</span>
			{#each deckSummary.textbooks as tb}
				<div class="flex flex-col overflow-hidden rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]">
					<button onclick={() => toggleTextbook(tb.textbookId)}
						class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-800)] transition-colors text-left">
						<span class="text-sm font-medium text-[var(--color-text-primary)] flex-1 truncate">{tb.textbookTitle}</span>
						{#if tb.chapters.reduce((s, ch) => s + ch.dueCount, 0) > 0}
							<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{tb.chapters.reduce((s, ch) => s + ch.dueCount, 0)}</span>
						{/if}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="shrink-0 text-[var(--color-text-muted)]">
							{#if expandedTextbooks.has(tb.textbookId)}<polyline points="18 15 12 9 6 15"/>{:else}<polyline points="6 9 12 15 18 9"/>{/if}
						</svg>
					</button>
					{#if expandedTextbooks.has(tb.textbookId)}
						<div class="border-t border-[var(--color-surface-700)]">
							{#each tb.chapters as ch}
								<div class="flex items-center gap-3 border-b border-[var(--color-surface-700)]/50 px-4 py-3 last:border-0">
									<div class="flex-1 min-w-0">
										<p class="text-sm text-[var(--color-text-primary)] truncate">{ch.chapterTitle}</p>
										<p class="text-xs text-[var(--color-text-muted)]">{ch.totalCards} cards · {ch.totalCards - ch.newCount} scheduled</p>
									</div>
									{#if ch.dueCount > 0}<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{ch.dueCount} due</span>{/if}
									<div class="flex shrink-0 items-center gap-1.5">
										{#if ch.dueCount > 0}
											<button onclick={() => startDeckReview(ch.chapterId, 'chapter')} disabled={sessionLoading}
												class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">Review due</button>
										{/if}
										{#if ch.newCount > 0}
											<button onclick={() => startDeckNew(ch.chapterId, 'chapter')} disabled={sessionLoading}
												class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">New ({ch.newCount})</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if deckSummary.soloDecks.length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Solo Decks</span>
			{#each deckSummary.soloDecks as deck}
				<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{deck.categoryName}</p>
						<p class="text-xs text-[var(--color-text-muted)]">{deck.totalCards} cards · {deck.totalCards - deck.newCount} scheduled</p>
					</div>
					{#if deck.dueCount > 0}<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{deck.dueCount} due</span>{/if}
					<div class="flex shrink-0 items-center gap-1.5">
						{#if deck.dueCount > 0}
							<button onclick={() => startDeckReview(deck.categoryId, 'category')} disabled={sessionLoading}
								class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">Review due</button>
						{/if}
						{#if deck.newCount > 0}
							<button onclick={() => startDeckNew(deck.categoryId, 'category')} disabled={sessionLoading}
								class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">New ({deck.newCount})</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{:else if activeTab === 'stats' && stats && settings}
<div class="flex flex-col gap-5">
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Streak 🔥</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.streak}</span>
			<span class="text-xs text-[var(--color-text-muted)]">{stats.streak === 1 ? 'day' : 'days'} in a row</span>
		</div>
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Total Reviewed</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.totalReviewed}</span>
		</div>
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Mastered 🏆</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.masteredCards}</span>
		</div>
		<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
			<span class="text-xs text-[var(--color-text-muted)]">Pass Rate (30d)</span>
			<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.retentionRate}%</span>
		</div>
	</div>
	<!-- Weekly bar chart -->
	<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
		<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Last 7 Days</span>
		<div class="flex gap-2">
			<div class="flex flex-col justify-between text-right pb-5" style="min-width:24px;">
				{#each chartYLabels as label}<span class="text-[10px] text-[var(--color-text-muted)] leading-none">{label}</span>{/each}
			</div>
			<div class="flex flex-1 items-end gap-1.5" style="height:100px;">
				{#each weeklyData as day}
					{@const total = day.correct + day.partial + day.incorrect}
					{@const barH = total === 0 ? 0 : Math.max(4, Math.round((total / maxBarHeight) * 100))}
					<div class="group relative flex flex-1 flex-col items-center gap-1">
						<div class="w-full flex flex-col-reverse rounded-sm overflow-hidden" style="height:{barH}%; min-height:{total > 0 ? 4 : 0}px; background: var(--color-surface-700);">
							{#if total > 0}
								{#if day.correct > 0}<div style="height:{(day.correct/total)*100}%; background:var(--color-success-500);"></div>{/if}
								{#if day.partial > 0}<div style="height:{(day.partial/total)*100}%; background:var(--color-warning-400);"></div>{/if}
								{#if day.incorrect > 0}<div style="height:{(day.incorrect/total)*100}%; background:var(--color-error-500);"></div>{/if}
							{/if}
						</div>
						{#if total > 0}<span class="text-[9px] font-medium text-[var(--color-text-muted)]">{total}</span>{/if}
					</div>
				{/each}
			</div>
		</div>
		<div class="flex gap-1.5 pl-8">
			{#each weeklyData as day}
				<div class="flex flex-1 justify-center">
					<span class="text-[10px] text-[var(--color-text-muted)]">{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
{/if}
{/if}

</div>
