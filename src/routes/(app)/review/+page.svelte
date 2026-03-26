<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCurrentUser } from '$lib/auth/authService';
	import {
		getReviewSettings, updateReviewSettings, getDueCount,
		getReviewStats, getAllDecksWithDueCount, getTodayReviews,
		getDueCards, getDueCardsByDeck, getNewCards, getNewCardsByDeck,
		getNewCardCount, getNewCardsIntroducedToday, getSchedule
	} from '$lib/review/reviewService';
	import {
		reviewSession, currentCard, reviewProgress, reviewSummary,
		startSession, rateCard, endSession, resetSession
	} from '$lib/review/reviewSessionStore';
	import type { SessionMode } from '$lib/review/reviewSessionStore';
	import { getNextReviewPreview } from '$lib/review/reviewUtils';
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
	let newIntroducedToday = $state(0);

	// Per-day bar chart data
	let weeklyData = $state<Array<{ date: string; correct: number; partial: number; incorrect: number }>>([]);

	// Leitner box counts
	let leitnerBoxCounts = $state<number[]>([0, 0, 0, 0, 0]);

	// Next review preview for current card
	let currentPreview = $state<{ correct: string; partial: string; incorrect: string } | null>(null);

	$effect(() => {
		if ($currentCard && settings && sessionActive) {
			loadPreview($currentCard.id);
		}
	});

	async function loadPreview(flashcardId: string) {
		if (!settings) return;
		try {
			const schedule = await getSchedule(flashcardId);
			currentPreview = getNextReviewPreview(schedule, settings.defaultAlgorithm);
		} catch { currentPreview = null; }
	}

	onMount(async () => {
		loading = true;
		try {
			const [s, st, ds, tr, nnc, nit] = await Promise.all([
				getReviewSettings(),
				getReviewStats(),
				getAllDecksWithDueCount(),
				getTodayReviews(),
				getNewCardCount(),
				getNewCardsIntroducedToday()
			]);
			settings = s;
			stats = st;
			deckSummary = ds;
			todayReviews = tr;
			totalNewAvailable = nnc;
			newIntroducedToday = nit;
			await loadWeeklyData();
			if (s.defaultAlgorithm === 'leitner') await loadLeitnerBoxCounts();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load review data.';
		} finally { loading = false; }
	});

	async function loadWeeklyData() {
		const uid = pb.authStore.record?.id ?? '';
		try {
			const days: Array<{ date: string; correct: number; partial: number; incorrect: number }> = [];
			for (let i = 6; i >= 0; i--) {
				const d = new Date();
				d.setDate(d.getDate() - i);
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

	async function loadLeitnerBoxCounts() {
		const uid = pb.authStore.record?.id ?? '';
		try {
			const schedules = await pb.collection('card_schedules').getFullList({
				requestKey: null,
				filter: `user = "${uid}"`,
				fields: 'leitnerBox'
			});
			const counts = [0, 0, 0, 0, 0];
			for (const s of schedules) {
				const box = (s.leitnerBox as number) ?? 1;
				if (box >= 1 && box <= 5) counts[box - 1]++;
			}
			leitnerBoxCounts = counts;
		} catch { /* silent */ }
	}

	async function startAllDue() {
		sessionLoading = true;
		try {
			const dueSchedules = await getDueCards();
			if (dueSchedules.length === 0) return;
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, 'review');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startDeckReview(deckId: string, deckType: 'chapter' | 'category') {
		sessionLoading = true;
		try {
			const dueSchedules = await getDueCardsByDeck(deckId, deckType);
			if (dueSchedules.length === 0) return;
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, 'review');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startNewCards() {
		if (!settings) return;
		sessionLoading = true;
		try {
			const remaining = Math.max(0, settings.dailyNewCardLimit - (stats?.newCardsToday ?? 0));
			if (remaining <= 0) return;
			const newCardIds = await getNewCards(remaining);
			if (newCardIds.length === 0) { error = 'No new cards available. All your cards are already scheduled.'; return; }
			const cards = await fetchFlashcardsByIds(newCardIds);
			startSession(cards, 'review');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start new cards.'; }
		finally { sessionLoading = false; }
	}

	async function startDeckNew(deckId: string, deckType: 'chapter' | 'category') {
		if (!settings) return;
		sessionLoading = true;
		try {
			const newCardIds = await getNewCardsByDeck(deckId, deckType, settings.dailyNewCardLimit);
			if (newCardIds.length === 0) return;
			const cards = await fetchFlashcardsByIds(newCardIds);
			startSession(cards, 'review');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startPracticeAll() {
		sessionLoading = true;
		try {
			// Practice uses due cards — or all scheduled cards if you want everything
			const dueSchedules = await getDueCards();
			if (dueSchedules.length === 0) { error = 'No due cards to practice right now.'; return; }
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, 'practice');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start practice.'; }
		finally { sessionLoading = false; }
	}

	async function startPracticeDeck(deckId: string, deckType: 'chapter' | 'category') {
		sessionLoading = true;
		try {
			const dueSchedules = await getDueCardsByDeck(deckId, deckType);
			if (dueSchedules.length === 0) { error = 'No due cards in this deck.'; return; }
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, 'practice');
			sessionActive = true;
			cardFlipped = false;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start practice.'; }
		finally { sessionLoading = false; }
	}

	async function fetchFlashcardsByIds(ids: string[]): Promise<Flashcard[]> {
		if (ids.length === 0) return [];
		const filter = '(' + ids.map((id) => `id = "${id}"`).join(' || ') + ')';
		const records = await pb.collection('flashcards').getFullList({
			requestKey: null, filter
		});
		return records.map((r) => ({
			id: r.id as string,
			owner: r.owner as string,
			frontText: r.front_text as string,
			frontImageUrl: r.front_image ? pb.files.getURL(r, r.front_image as string) : '',
			frontAudioUrl: r.front_audio ? pb.files.getURL(r, r.front_audio as string) : '',
			backText: r.back_text as string,
			backImageUrl: r.back_image ? pb.files.getURL(r, r.back_image as string) : '',
			backAudioUrl: r.back_audio ? pb.files.getURL(r, r.back_audio as string) : '',
			chapter: (r.chapter as string) ?? '',
			category: (r.category as string) ?? '',
			order: r.order as number,
			created: r.created as string,
			updated: r.updated as string
		}));
	}

	async function handleRate(r: 'correct' | 'partial' | 'incorrect') {
		rating = true;
		try {
			await rateCard(r);
			cardFlipped = false;
		} finally { rating = false; }
	}

	function handleEndSession() {
		endSession();
	}

	async function handleBackToReview() {
		resetSession();
		sessionActive = false;
		loading = true;
		try {
			const [s, st, ds, tr, nnc, nit] = await Promise.all([
				getReviewSettings(),
				getReviewStats(),
				getAllDecksWithDueCount(),
				getTodayReviews(),
				getNewCardCount(),
				getNewCardsIntroducedToday()
			]);
			settings = s;
			stats = st;
			deckSummary = ds;
			todayReviews = tr;
			totalNewAvailable = nnc;
			newIntroducedToday = nit;
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
		if (h < 12) return 'Good morning';
		if (h < 18) return 'Good afternoon';
		return 'Good evening';
	}

	const maxBarHeight = $derived(
		weeklyData.reduce((max, d) => Math.max(max, d.correct + d.partial + d.incorrect), 1)
	);

	// Today's review breakdown
	const todayCorrect = $derived(todayReviews.filter((r) => r.rating === 'correct').length);
	const todayPartial = $derived(todayReviews.filter((r) => r.rating === 'partial').length);
	const todayIncorrect = $derived(todayReviews.filter((r) => r.rating === 'incorrect').length);
	const todayTotal = $derived(todayReviews.length);
	const todayPassRate = $derived(todayTotal > 0 ? Math.round(((todayCorrect + todayPartial) / todayTotal) * 100) : 0);

	// Chart Y-axis labels (0, half, max)
	const chartYLabels = $derived([maxBarHeight, Math.round(maxBarHeight / 2), 0]);

	const BOX_INTERVALS_LABELS = ['Daily', 'Every 3 days', 'Weekly', 'Every 2 weeks', 'Monthly'];
	const BOX_COLORS = [
		'var(--color-error-500)',
		'var(--color-warning-500)',
		'var(--color-accent-500)',
		'color-mix(in srgb, var(--color-accent-400) 70%, var(--color-success-500))',
		'var(--color-success-500)'
	];
</script>

<svelte:head><title>Review — StudyApp</title></svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">

	{#if sessionActive && !$reviewSession.isComplete}
	<!-- ── REVIEW SESSION ──────────────────────────────────────────────── -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between gap-4">
			<div class="flex flex-col gap-0.5">
				<div class="flex items-center gap-2">
					<h1 class="font-display text-2xl text-[var(--color-text-primary)]">
						{$reviewSession.mode === 'practice' ? 'Practice' : 'Review'}
					</h1>
					{#if $reviewSession.mode === 'practice'}
						<span class="rounded-full px-2 py-0.5 text-xs font-medium"
						      style="background: color-mix(in srgb, var(--color-warning-500) 15%, transparent); color: var(--color-warning-400);">
							Practice
						</span>
					{/if}
				</div>
				{#if $reviewSession.mode === 'practice'}
					<span class="text-sm text-[var(--color-text-secondary)]">
						{$reviewSession.queue.length} card{$reviewSession.queue.length !== 1 ? 's' : ''} remaining · wrong cards repeat
					</span>
				{:else}
					<span class="text-sm text-[var(--color-text-secondary)]">
						Card {$reviewSession.currentIndex + 1} of {$reviewSession.cards.length}
					</span>
				{/if}
			</div>
			<button
				onclick={handleEndSession}
				class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
				       text-[var(--color-text-secondary)] hover:text-[var(--color-error-400)] transition-colors"
			>
				End Session
			</button>
		</div>

		<!-- Progress bar -->
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
			<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300"
			     style="width:{$reviewProgress}%"></div>
		</div>

		{#if $currentCard}
			<!-- Inline flip card — local state drives the reveal -->
			<div style="perspective: 1000px; height: 260px; width: 100%;">
				<button
					onclick={() => (cardFlipped = true)}
					class="relative w-full h-full cursor-pointer"
					aria-label="Flip card"
					style="transform-style: preserve-3d; transition: transform 0.5s; transform: {cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}"
				>
					<!-- Front -->
					<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-800)] p-5 overflow-hidden"
					     style="backface-visibility: hidden; -webkit-backface-visibility: hidden;">
						<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Front</span>
						<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
							<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{$currentCard.frontText}</p>
							{#if $currentCard.frontImageUrl}
								<img src={$currentCard.frontImageUrl} alt="Front"
								     class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />
							{/if}
						</div>
						<p class="shrink-0 text-center text-xs text-[var(--color-text-muted)] mt-2">Click to flip</p>
					</div>
					<!-- Back -->
					<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-accent-500)]/30
					            bg-[var(--color-surface-800)] p-5 overflow-hidden"
					     style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);">
						<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Back</span>
						<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
							<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{$currentCard.backText}</p>
							{#if $currentCard.backImageUrl}
								<img src={$currentCard.backImageUrl} alt="Back"
								     class="rounded-lg border border-[var(--color-surface-700)] max-h-24 object-contain" />
							{/if}
						</div>
					</div>
				</button>
			</div>

			{#if !cardFlipped}
				<p class="text-center text-sm text-[var(--color-text-muted)]">Click the card to reveal the answer</p>
			{:else}
				<!-- Next review previews — only for review mode -->
				{#if currentPreview && $reviewSession.mode === 'review'}
					<div class="flex items-center justify-center gap-4 rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-900)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
						<span class="text-[var(--color-success-500)]">✓ {currentPreview.correct}</span>
						<span class="text-[var(--color-warning-400)]">~ {currentPreview.partial}</span>
						<span class="text-[var(--color-error-400)]">✗ {currentPreview.incorrect}</span>
					</div>
				{/if}
				{#if $reviewSession.mode === 'practice'}
					<div class="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-warning-500)]/20
					            bg-[var(--color-warning-500)]/5 px-4 py-2 text-xs text-[var(--color-warning-400)]">
						<span>✗ / ~ → card repeats · ✓ → removed from queue</span>
					</div>
				{/if}

				<!-- Rating buttons -->
				<div class="grid grid-cols-3 gap-3">
					<button
						onclick={() => handleRate('incorrect')}
						disabled={rating}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-error-500)]/30
						       bg-[var(--color-error-500)]/10 py-3 text-xs font-medium text-[var(--color-error-400)]
						       hover:bg-[var(--color-error-500)]/20 disabled:opacity-50 transition-colors"
					>
						<span class="text-lg">✗</span>Incorrect
					</button>
					<button
						onclick={() => handleRate('partial')}
						disabled={rating}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-warning-500)]/30
						       bg-[var(--color-warning-500)]/10 py-3 text-xs font-medium text-[var(--color-warning-400)]
						       hover:bg-[var(--color-warning-500)]/20 disabled:opacity-50 transition-colors"
					>
						<span class="text-lg">~</span>Partial
					</button>
					<button
						onclick={() => handleRate('correct')}
						disabled={rating}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-success-500)]/30
						       bg-[var(--color-success-500)]/10 py-3 text-xs font-medium text-[var(--color-success-500)]
						       hover:bg-[var(--color-success-500)]/20 disabled:opacity-50 transition-colors"
					>
						<span class="text-lg">✓</span>Correct
					</button>
				</div>
			{/if}
		{/if}
	</div>

	{:else if sessionActive && $reviewSession.isComplete}
	<!-- ── SESSION COMPLETE ───────────────────────────────────────────── -->
	<div class="flex flex-col gap-6 rounded-xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)] p-8 max-w-xl">
		<div class="flex flex-col items-center gap-2 text-center">
			<span class="text-3xl">🎉</span>
			<h2 class="font-display text-2xl text-[var(--color-text-primary)]">
				{$reviewSession.mode === 'practice' ? 'Practice Complete!' : 'Session Complete!'}
			</h2>
			{#if $reviewSession.mode === 'practice'}
				<p class="text-sm text-[var(--color-text-secondary)]">
					You got all {$reviewSummary.masteredCount} card{$reviewSummary.masteredCount !== 1 ? 's' : ''} correct — {$reviewSummary.total} total answers
				</p>
			{:else}
				<p class="text-sm text-[var(--color-text-secondary)]">{$reviewSummary.total} cards reviewed</p>
			{/if}
		</div>

		<!-- Results bar -->
		{#if $reviewSummary.total > 0}
			<div class="flex h-3 w-full overflow-hidden rounded-full">
				{#if $reviewSummary.correct > 0}
					<div class="bg-[var(--color-success-500)] transition-all"
					     style="width:{($reviewSummary.correct/$reviewSummary.total)*100}%"></div>
				{/if}
				{#if $reviewSummary.partial > 0}
					<div class="bg-[var(--color-warning-400)] transition-all"
					     style="width:{($reviewSummary.partial/$reviewSummary.total)*100}%"></div>
				{/if}
				{#if $reviewSummary.incorrect > 0}
					<div class="bg-[var(--color-error-500)] transition-all"
					     style="width:{($reviewSummary.incorrect/$reviewSummary.total)*100}%"></div>
				{/if}
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

		{#if $reviewSession.mode === 'review'}
			<div class="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] px-4 py-3 text-sm">
				<div class="flex flex-col gap-0.5">
					<span class="text-xs text-[var(--color-text-muted)]">Pass rate</span>
					<span class="font-semibold text-[var(--color-text-primary)]">{$reviewSummary.retention}%</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-xs text-[var(--color-text-muted)]">Avg next review</span>
					<span class="font-semibold text-[var(--color-text-primary)]">
						{$reviewSummary.avgInterval > 0 ? `${$reviewSummary.avgInterval} days` : '—'}
					</span>
				</div>
			</div>
		{:else}
			<div class="rounded-xl border border-[var(--color-warning-500)]/20 bg-[var(--color-warning-500)]/5 px-4 py-3">
				<p class="text-xs text-[var(--color-warning-400)]">
					Practice mode: only cards you answered <strong>Correct</strong> were scheduled in SM-2. Wrong cards are not penalised.
				</p>
			</div>
		{/if}

		<button
			onclick={handleBackToReview}
			class="w-full rounded-xl bg-[var(--color-accent-500)] py-2.5 text-sm font-medium
			       text-white hover:bg-[var(--color-accent-400)] transition-colors"
		>
			Back to Review
		</button>
	</div>

	{:else}
	<!-- ── NORMAL REVIEW TABS ─────────────────────────────────────────── -->
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Review</h1>
		<p class="text-[var(--color-text-secondary)]">Spaced repetition — review cards when they're due.</p>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	<!-- Tab bar -->
	<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
		{#each (['today', 'decks', 'stats'] as Tab[]) as tab}
			<button
				onclick={() => (activeTab = tab)}
				class="px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors
				       {activeTab === tab
					? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
					: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}"
			>
				{tab}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex flex-col gap-3">
			{#each Array(3) as _}
				<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>
			{/each}
		</div>

	{:else if activeTab === 'today' && settings && stats}
	<!-- ── TODAY TAB ───────────────────────────────────────────────────── -->
	<div class="flex flex-col gap-5">
		<!-- Greeting -->
		<p class="text-base text-[var(--color-text-secondary)]">
			{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
		</p>

		<!-- Stat cards -->
		<div class="grid grid-cols-3 gap-3">
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Due Today</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.dueToday}</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Reviewed</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.reviewedToday}</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">New Today</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">
					{stats.newCardsToday}<span class="text-sm text-[var(--color-text-muted)]">/{settings.dailyNewCardLimit}</span>
				</span>
			</div>
		</div>

		<!-- Review queue -->
		{#if stats.dueToday > 0}
			<div class="flex flex-col gap-3">
				<div class="flex gap-2">
					<button
						onclick={startAllDue}
						disabled={sessionLoading}
						class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-3
						       text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
						       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{sessionLoading ? 'Loading…' : `Review (${stats.dueToday})`}
					</button>
					<button
						onclick={startPracticeAll}
						disabled={sessionLoading}
						title="Wrong cards repeat until correct"
						class="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-warning-500)]/50
						       bg-[var(--color-warning-500)]/10 px-4 py-3 text-sm font-medium
						       text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/20
						       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						🔄 Practice
					</button>
				</div>
				<p class="text-xs text-[var(--color-text-muted)] px-1">
					<strong class="text-[var(--color-text-secondary)]">Review</strong> schedules cards with SM-2 (wrong → tomorrow) ·
					<strong class="text-[var(--color-text-secondary)]">Practice</strong> keeps wrong cards in the queue until correct
				</p>

				{#if deckSummary}
					<!-- Textbooks section -->
					{#if deckSummary.textbooks.some((tb) => tb.chapters.some((ch) => ch.dueCount > 0))}
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">Textbooks</span>
							{#each deckSummary.textbooks.filter((tb) => tb.chapters.some((ch) => ch.dueCount > 0)) as tb}
								{#each tb.chapters.filter((ch) => ch.dueCount > 0) as ch}
									<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)]
									            bg-[var(--color-surface-900)] px-4 py-3">
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{ch.chapterTitle}</p>
											<p class="text-xs text-[var(--color-text-muted)] truncate">{tb.textbookTitle}</p>
										</div>
										<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
										             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">
											{ch.dueCount}
										</span>
										<button
											onclick={() => startDeckReview(ch.chapterId, 'chapter')}
											disabled={sessionLoading}
											class="shrink-0 rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs
											       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
											       disabled:opacity-50 transition-colors"
										>
											Review
										</button>
										<button
											onclick={() => startPracticeDeck(ch.chapterId, 'chapter')}
											disabled={sessionLoading}
											class="shrink-0 rounded-lg border border-[var(--color-warning-500)]/40 px-3 py-1.5 text-xs
											       text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/10
											       disabled:opacity-50 transition-colors"
										>
											Practice
										</button>
									</div>
								{/each}
							{/each}
						</div>
					{/if}

					<!-- Solo decks section -->
					{#if deckSummary.soloDecks.some((d) => d.dueCount > 0)}
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">Solo Decks</span>
							{#each deckSummary.soloDecks.filter((d) => d.dueCount > 0) as deck}
								<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)]
								            bg-[var(--color-surface-900)] px-4 py-3">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{deck.categoryName}</p>
									</div>
									<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
									             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">
										{deck.dueCount}
									</span>
									<button
										onclick={() => startDeckReview(deck.categoryId, 'category')}
										disabled={sessionLoading}
										class="shrink-0 rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs
										       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
										       disabled:opacity-50 transition-colors"
									>
										Review
									</button>
									<button
										onclick={() => startPracticeDeck(deck.categoryId, 'category')}
										disabled={sessionLoading}
										class="shrink-0 rounded-lg border border-[var(--color-warning-500)]/40 px-3 py-1.5 text-xs
										       text-[var(--color-warning-400)] hover:bg-[var(--color-warning-500)]/10
										       disabled:opacity-50 transition-colors"
									>
										Practice
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<!-- Nothing due — show what was completed today if anything -->
			{#if todayTotal > 0}
				<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-success-500)]/30
				            bg-[var(--color-success-500)]/5 p-4">
					<div class="flex items-center gap-2">
						<span class="text-xl">✅</span>
						<p class="text-sm font-medium text-[var(--color-success-500)]">All caught up! Nothing due right now.</p>
					</div>
					<p class="text-xs text-[var(--color-text-muted)]">
						Cards you reviewed today were rescheduled for a future date based on your answers. Come back tomorrow!
					</p>
					<div class="grid grid-cols-3 gap-2 pt-1">
						<div class="flex flex-col items-center gap-0.5 rounded-lg bg-[var(--color-surface-800)] py-2">
							<span class="text-base font-semibold text-[var(--color-success-500)]">{todayCorrect}</span>
							<span class="text-[10px] text-[var(--color-text-muted)]">Correct</span>
						</div>
						<div class="flex flex-col items-center gap-0.5 rounded-lg bg-[var(--color-surface-800)] py-2">
							<span class="text-base font-semibold text-[var(--color-warning-400)]">{todayPartial}</span>
							<span class="text-[10px] text-[var(--color-text-muted)]">Partial</span>
						</div>
						<div class="flex flex-col items-center gap-0.5 rounded-lg bg-[var(--color-surface-800)] py-2">
							<span class="text-base font-semibold text-[var(--color-error-400)]">{todayIncorrect}</span>
							<span class="text-[10px] text-[var(--color-text-muted)]">Incorrect</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 rounded-xl border border-dashed
				            border-[var(--color-surface-600)] py-12 text-center">
					<span class="text-2xl">✅</span>
					<p class="text-sm font-medium text-[var(--color-text-secondary)]">All caught up! Nothing due today.</p>
					<p class="text-xs text-[var(--color-text-muted)]">Start reviewing new cards below to build your queue.</p>
				</div>
			{/if}
		{/if}

		<!-- New cards -->
		<div class="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] px-4 py-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Introduce New Cards</span>
				<span class="text-xs text-[var(--color-text-muted)]">
					{#if stats.newCardsToday >= settings.dailyNewCardLimit}
						Daily limit reached ({settings.dailyNewCardLimit} new cards)
					{:else}
						{settings.dailyNewCardLimit - stats.newCardsToday} remaining today
					{/if}
				</span>
			</div>
			<button
				onclick={startNewCards}
				disabled={sessionLoading || stats.newCardsToday >= settings.dailyNewCardLimit}
				class="shrink-0 rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
				       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
			>
				Study new cards
			</button>
		</div>
	</div>

	{:else if activeTab === 'decks' && deckSummary}
	<!-- ── DECKS TAB ───────────────────────────────────────────────────── -->
	<div class="flex flex-col gap-6">
		<!-- Textbooks section -->
		{#if deckSummary.textbooks.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Textbooks</span>
				{#each deckSummary.textbooks as tb}
					<div class="flex flex-col overflow-hidden rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]">
						<!-- Textbook header -->
						<button
							onclick={() => toggleTextbook(tb.textbookId)}
							class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-800)] transition-colors text-left"
						>
							<div class="flex items-center gap-2 min-w-0 flex-1">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
								     class="shrink-0 text-[var(--color-accent-400)]">
									<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
								</svg>
								<span class="text-sm font-medium text-[var(--color-text-primary)] truncate">{tb.textbookTitle}</span>
							</div>
							{#if tb.chapters.reduce((s, ch) => s + ch.dueCount, 0) > 0}
								<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
								             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">
									{tb.chapters.reduce((s, ch) => s + ch.dueCount, 0)}
								</span>
							{/if}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							     stroke-width="2" stroke-linecap="round" class="shrink-0 text-[var(--color-text-muted)]">
								{#if expandedTextbooks.has(tb.textbookId)}
									<polyline points="18 15 12 9 6 15"/>
								{:else}
									<polyline points="6 9 12 15 18 9"/>
								{/if}
							</svg>
						</button>

						{#if expandedTextbooks.has(tb.textbookId)}
							<div class="border-t border-[var(--color-surface-700)]">
								{#if tb.chapters.length === 0}
									<p class="px-4 py-3 text-xs text-[var(--color-text-muted)]">No chapters with flashcards.</p>
								{:else}
									{#each tb.chapters as ch}
										<div class="flex items-center gap-3 border-b border-[var(--color-surface-700)]/50 px-4 py-3 last:border-0">
											<div class="flex-1 min-w-0">
												<p class="text-sm text-[var(--color-text-primary)] truncate">{ch.chapterTitle}</p>
												<p class="text-xs text-[var(--color-text-muted)]">
													{ch.totalCards} cards · {ch.totalCards - ch.newCount} scheduled
												</p>
											</div>
											{#if ch.dueCount > 0}
												<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
												             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">
													{ch.dueCount} due
												</span>
											{/if}
											<div class="flex shrink-0 items-center gap-1.5">
												{#if ch.dueCount > 0}
													<button
														onclick={() => startDeckReview(ch.chapterId, 'chapter')}
														disabled={sessionLoading}
														class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
														       text-white hover:bg-[var(--color-accent-400)]
														       disabled:opacity-50 transition-colors"
													>
														Review due
													</button>
												{/if}
												{#if ch.newCount > 0}
													<button
														onclick={() => startDeckNew(ch.chapterId, 'chapter')}
														disabled={sessionLoading}
														class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
														       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
														       disabled:opacity-50 transition-colors"
													>
														New ({ch.newCount})
													</button>
												{/if}
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Solo Decks section -->
		{#if deckSummary.soloDecks.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Solo Decks</span>
				{#each deckSummary.soloDecks as deck}
					<div class="flex items-center gap-3 rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-900)] px-4 py-3">
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{deck.categoryName}</p>
							<p class="text-xs text-[var(--color-text-muted)]">
								{deck.totalCards} cards · {deck.totalCards - deck.newCount} scheduled
							</p>
						</div>
						{#if deck.dueCount > 0}
							<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
							             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">
								{deck.dueCount} due
							</span>
						{/if}
						<div class="flex shrink-0 items-center gap-1.5">
							{#if deck.dueCount > 0}
								<button
									onclick={() => startDeckReview(deck.categoryId, 'category')}
									disabled={sessionLoading}
									class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1 text-xs font-medium
									       text-white hover:bg-[var(--color-accent-400)]
									       disabled:opacity-50 transition-colors"
								>
									Review due
								</button>
							{/if}
							{#if deck.newCount > 0}
								<button
									onclick={() => startDeckNew(deck.categoryId, 'category')}
									disabled={sessionLoading}
									class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
									       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
									       disabled:opacity-50 transition-colors"
								>
									New ({deck.newCount})
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if deckSummary.textbooks.length === 0 && deckSummary.soloDecks.length === 0}
			<div class="flex flex-col items-center gap-3 rounded-xl border border-dashed
			            border-[var(--color-surface-600)] py-12 text-center">
				<p class="text-sm font-medium text-[var(--color-text-secondary)]">No flashcard decks yet</p>
				<p class="text-sm text-[var(--color-text-muted)]">Create flashcards in Creator mode to start reviewing.</p>
			</div>
		{/if}
	</div>

	{:else if activeTab === 'stats' && stats && settings}
	<!-- ── STATS TAB ───────────────────────────────────────────────────── -->
	<div class="flex flex-col gap-5">

		<!-- Main stat grid -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Streak 🔥</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.streak}</span>
				<span class="text-xs text-[var(--color-text-muted)]">{stats.streak === 1 ? 'day' : 'days'} in a row</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Total Reviewed</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.totalReviewed}</span>
				<span class="text-xs text-[var(--color-text-muted)]">all time</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Mastered 🏆</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.masteredCards}</span>
				<span class="text-xs text-[var(--color-text-muted)]">≥21 day interval</span>
			</div>
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Pass Rate (30d)</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.retentionRate}%</span>
				<span class="text-xs text-[var(--color-text-muted)]">correct answers</span>
			</div>
		</div>

		<!-- Today's session summary (if any reviews done today) -->
		{#if todayTotal > 0}
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Today's Session</span>
				<div class="flex items-center gap-4">
					<div class="flex-1 flex flex-col gap-1">
						<div class="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
							{#if todayCorrect > 0}<div class="bg-[var(--color-success-500)]" style="width:{(todayCorrect/todayTotal)*100}%"></div>{/if}
							{#if todayPartial > 0}<div class="bg-[var(--color-warning-400)]" style="width:{(todayPartial/todayTotal)*100}%"></div>{/if}
							{#if todayIncorrect > 0}<div class="bg-[var(--color-error-500)]" style="width:{(todayIncorrect/todayTotal)*100}%"></div>{/if}
						</div>
						<div class="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
							<span>{todayTotal} cards reviewed</span>
							<span class="font-medium text-[var(--color-text-secondary)]">{todayPassRate}% pass rate</span>
						</div>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex items-center gap-1.5 rounded-lg bg-[var(--color-success-500)]/10 px-3 py-2">
						<span class="text-sm font-bold text-[var(--color-success-500)]">{todayCorrect}</span>
						<span class="text-xs text-[var(--color-text-muted)]">Correct</span>
					</div>
					<div class="flex items-center gap-1.5 rounded-lg bg-[var(--color-warning-400)]/10 px-3 py-2">
						<span class="text-sm font-bold text-[var(--color-warning-400)]">{todayPartial}</span>
						<span class="text-xs text-[var(--color-text-muted)]">Partial</span>
					</div>
					<div class="flex items-center gap-1.5 rounded-lg bg-[var(--color-error-500)]/10 px-3 py-2">
						<span class="text-sm font-bold text-[var(--color-error-400)]">{todayIncorrect}</span>
						<span class="text-xs text-[var(--color-text-muted)]">Incorrect</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- SM-2 ease factor -->
		{#if settings.defaultAlgorithm === 'sm2' && stats.averageEase !== undefined}
			<div class="flex items-center justify-between rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<div class="flex flex-col gap-0.5">
					<span class="text-xs text-[var(--color-text-muted)]">Average Ease Factor</span>
					<span class="text-xs text-[var(--color-text-muted)]">Higher = easier cards (max 2.5)</span>
				</div>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.averageEase}</span>
			</div>
		{/if}

		<!-- Weekly bar chart — fixed with Y-axis and totals -->
		<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Last 7 Days</span>
			<div class="flex gap-2">
				<!-- Y-axis labels -->
				<div class="flex flex-col justify-between text-right pb-5" style="min-width:24px;">
					{#each chartYLabels as label}
						<span class="text-[10px] text-[var(--color-text-muted)] leading-none">{label}</span>
					{/each}
				</div>
				<!-- Bars -->
				<div class="flex flex-1 items-end gap-1.5" style="height:100px;">
					{#each weeklyData as day}
						{@const total = day.correct + day.partial + day.incorrect}
						{@const barH = total === 0 ? 0 : Math.max(4, Math.round((total / maxBarHeight) * 100))}
						<div class="group relative flex flex-1 flex-col items-center gap-1">
							<!-- Tooltip -->
							{#if total > 0}
								<div class="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2
								            hidden group-hover:flex flex-col items-center z-10">
									<div class="rounded-lg border border-[var(--color-surface-600)]
									            bg-[var(--color-surface-800)] px-2.5 py-1.5 text-[10px]
									            text-[var(--color-text-secondary)] whitespace-nowrap shadow-lg">
										<div class="font-semibold text-[var(--color-text-primary)]">{total} total</div>
										{#if day.correct > 0}<div class="text-[var(--color-success-500)]">✓ {day.correct}</div>{/if}
										{#if day.partial > 0}<div class="text-[var(--color-warning-400)]">~ {day.partial}</div>{/if}
										{#if day.incorrect > 0}<div class="text-[var(--color-error-400)]">✗ {day.incorrect}</div>{/if}
									</div>
								</div>
							{/if}
							<!-- Stacked bar -->
							<div class="w-full flex flex-col-reverse rounded-sm overflow-hidden"
							     style="height:{barH}%; min-height:{total > 0 ? 4 : 0}px; background: var(--color-surface-700);">
								{#if total > 0}
									{#if day.correct > 0}
										<div style="height:{(day.correct/total)*100}%; background:var(--color-success-500);"></div>
									{/if}
									{#if day.partial > 0}
										<div style="height:{(day.partial/total)*100}%; background:var(--color-warning-400);"></div>
									{/if}
									{#if day.incorrect > 0}
										<div style="height:{(day.incorrect/total)*100}%; background:var(--color-error-500);"></div>
									{/if}
								{/if}
							</div>
							<!-- Count above bar -->
							{#if total > 0}
								<span class="text-[9px] font-medium text-[var(--color-text-muted)]">{total}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			<!-- Day labels -->
			<div class="flex gap-1.5 pl-8">
				{#each weeklyData as day}
					<div class="flex flex-1 justify-center">
						<span class="text-[10px] text-[var(--color-text-muted)]">
							{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
						</span>
					</div>
				{/each}
			</div>
			<div class="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
				<span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-[var(--color-success-500)]"></span>Correct</span>
				<span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-[var(--color-warning-400)]"></span>Partial</span>
				<span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-[var(--color-error-500)]"></span>Incorrect</span>
			</div>
		</div>

	</div>
	{/if}
	{/if}
</div>
