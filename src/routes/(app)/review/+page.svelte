<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCurrentUser } from '$lib/auth/authService';
	import {
		getReviewSettings, updateReviewSettings, getDueCount,
		getReviewStats, getAllDecksWithDueCount, getTodayReviews,
		getDueCards, getDueCardsByDeck, getNewCards, getNewCardsByDeck,
		getSchedule
	} from '$lib/review/reviewService';
	import {
		reviewSession, currentCard, reviewProgress, reviewSummary,
		startSession, flipCurrent, rateCard, endSession, resetSession
	} from '$lib/review/reviewSessionStore';
	import { getNextReviewPreview, getAlgorithmLabel, getNextReviewLabel } from '$lib/review/reviewUtils';
	import type { ReviewSettings, ReviewStats, DeckReviewSummary, ReviewAlgorithm } from '$lib/review/reviewTypes';
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import { pb } from '$lib/shared/pocketbase';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';

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
	let expandedTextbooks = $state<Set<string>>(new Set());

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
			const [s, st, ds] = await Promise.all([
				getReviewSettings(),
				getReviewStats(),
				getAllDecksWithDueCount()
			]);
			settings = s;
			stats = st;
			deckSummary = ds;
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

	async function handleAlgorithmChange(algo: ReviewAlgorithm) {
		if (!settings) return;
		settings = { ...settings, defaultAlgorithm: algo };
		try {
			await updateReviewSettings({ defaultAlgorithm: algo });
		} catch { /* silent */ }
	}

	async function startAllDue() {
		if (!settings) return;
		sessionLoading = true;
		try {
			const dueSchedules = await getDueCards();
			if (dueSchedules.length === 0) return;
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, settings.defaultAlgorithm);
			sessionActive = true;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startDeckReview(deckId: string, deckType: 'chapter' | 'category') {
		if (!settings) return;
		sessionLoading = true;
		try {
			const dueSchedules = await getDueCardsByDeck(deckId, deckType);
			if (dueSchedules.length === 0) return;
			const cardIds = dueSchedules.map((s) => s.flashcard);
			const cards = await fetchFlashcardsByIds(cardIds);
			startSession(cards, settings.defaultAlgorithm);
			sessionActive = true;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
		finally { sessionLoading = false; }
	}

	async function startNewCards() {
		if (!settings) return;
		sessionLoading = true;
		try {
			const todayReviews = await getTodayReviews();
			const newToday = todayReviews.length;
			const remaining = settings.dailyNewCardLimit - newToday;
			if (remaining <= 0) return;
			const newCardIds = await getNewCards(remaining);
			if (newCardIds.length === 0) return;
			const cards = await fetchFlashcardsByIds(newCardIds);
			startSession(cards, settings.defaultAlgorithm);
			sessionActive = true;
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
			startSession(cards, settings.defaultAlgorithm);
			sessionActive = true;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not start session.'; }
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
		} finally { rating = false; }
	}

	function handleEndSession() {
		endSession();
	}

	async function handleBackToReview() {
		resetSession();
		sessionActive = false;
		// Refresh stats
		loading = true;
		try {
			const [s, st, ds] = await Promise.all([
				getReviewSettings(),
				getReviewStats(),
				getAllDecksWithDueCount()
			]);
			settings = s;
			stats = st;
			deckSummary = ds;
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
				<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Review Session</h1>
				<span class="text-sm text-[var(--color-text-secondary)]">
					Card {$reviewSession.currentIndex + 1} of {$reviewSession.cards.length}
				</span>
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
			<FlipCard
				frontText={$currentCard.frontText}
				frontImageUrl={$currentCard.frontImageUrl}
				frontAudioUrl={$currentCard.frontAudioUrl}
				backText={$currentCard.backText}
				backImageUrl={$currentCard.backImageUrl}
				backAudioUrl={$currentCard.backAudioUrl}
			/>

			{#if !$reviewSession.flipped}
				<!-- Show flip instruction -->
				<p class="text-center text-sm text-[var(--color-text-muted)]">Click the card to reveal the answer</p>
			{:else}
				<!-- Next review previews -->
				{#if currentPreview}
					<div class="flex items-center justify-center gap-4 rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-900)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
						<span class="text-[var(--color-success-500)]">✓ {currentPreview.correct}</span>
						<span class="text-[var(--color-warning-400)]">~ {currentPreview.partial}</span>
						<span class="text-[var(--color-error-400)]">✗ {currentPreview.incorrect}</span>
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
			<h2 class="font-display text-2xl text-[var(--color-text-primary)]">Session Complete!</h2>
			<p class="text-sm text-[var(--color-text-secondary)]">{$reviewSummary.total} cards reviewed</p>
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

		<div class="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] px-4 py-3 text-sm">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-[var(--color-text-muted)]">Retention</span>
				<span class="font-semibold text-[var(--color-text-primary)]">{$reviewSummary.retention}%</span>
			</div>
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-[var(--color-text-muted)]">Avg interval</span>
				<span class="font-semibold text-[var(--color-text-primary)]">
					{$reviewSummary.avgInterval > 0 ? `${$reviewSummary.avgInterval} days` : '—'}
				</span>
			</div>
		</div>

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

		<!-- Algorithm selector -->
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-medium text-[var(--color-text-secondary)]">Algorithm</span>
			<div class="flex gap-2">
				{#each (['sm2', 'simple', 'leitner'] as ReviewAlgorithm[]) as algo}
					<button
						onclick={() => handleAlgorithmChange(algo)}
						class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
						       {settings.defaultAlgorithm === algo
							? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
							: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
					>
						{getAlgorithmLabel(algo)}
					</button>
				{/each}
			</div>
		</div>

		<!-- Review queue -->
		{#if stats.dueToday > 0}
			<div class="flex flex-col gap-3">
				<button
					onclick={startAllDue}
					disabled={sessionLoading}
					class="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-3
					       text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
					       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{sessionLoading ? 'Loading…' : `Start Review (${stats.dueToday} cards)`}
				</button>

				{#if deckSummary}
					<!-- Textbooks section -->
					{@const tbsWithDue = deckSummary.textbooks.filter((tb) => tb.chapters.some((ch) => ch.dueCount > 0))}
					{#if tbsWithDue.length > 0}
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">Textbooks</span>
							{#each tbsWithDue as tb}
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
									</div>
								{/each}
							{/each}
						</div>
					{/if}

					<!-- Solo decks section -->
					{@const soloWithDue = deckSummary.soloDecks.filter((d) => d.dueCount > 0)}
					{#if soloWithDue.length > 0}
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">Solo Decks</span>
							{#each soloWithDue as deck}
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
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-3 rounded-xl border border-dashed
			            border-[var(--color-surface-600)] py-12 text-center">
				<span class="text-2xl">✅</span>
				<p class="text-sm font-medium text-[var(--color-text-secondary)]">All caught up! Nothing due today.</p>
			</div>
		{/if}

		<!-- New cards -->
		<div class="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] px-4 py-3">
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Introduce New Cards</span>
				<span class="text-xs text-[var(--color-text-muted)]">
					{settings.dailyNewCardLimit - stats.newCardsToday} remaining today
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
							{@const tbDue = tb.chapters.reduce((s, ch) => s + ch.dueCount, 0)}
							{#if tbDue > 0}
								<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
								             bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]">{tbDue}</span>
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
	<div class="flex flex-col gap-6">
		<!-- Stat grid -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Streak 🔥</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.streak}</span>
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
				<span class="text-xs text-[var(--color-text-muted)]">Retention (30d)</span>
				<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{stats.retentionRate}%</span>
			</div>
		</div>

		{#if settings.defaultAlgorithm === 'sm2' && stats.averageEase !== undefined}
			<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
				<span class="text-xs text-[var(--color-text-muted)]">Average Ease Factor (SM-2)</span>
				<span class="text-xl font-semibold text-[var(--color-text-primary)]">{stats.averageEase}</span>
			</div>
		{/if}

		<!-- Weekly bar chart -->
		<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
			<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Last 7 Days</span>
			<div class="flex items-end gap-2 h-28">
				{#each weeklyData as day}
					{@const total = day.correct + day.partial + day.incorrect}
					{@const h = total === 0 ? 2 : Math.max(4, (total / maxBarHeight) * 100)}
					<div class="flex flex-1 flex-col items-center gap-1.5 group relative">
						<div class="w-full flex flex-col justify-end rounded-t overflow-hidden" style="height:88px;">
							<div class="flex flex-col-reverse w-full" style="height:{h}%;">
								{#if day.incorrect > 0}
									<div class="w-full" style="height:{(day.incorrect/Math.max(1,total))*100}%; min-height:2px; background:var(--color-error-500);"></div>
								{/if}
								{#if day.partial > 0}
									<div class="w-full" style="height:{(day.partial/Math.max(1,total))*100}%; min-height:2px; background:var(--color-warning-400);"></div>
								{/if}
								{#if day.correct > 0}
									<div class="w-full" style="height:{(day.correct/Math.max(1,total))*100}%; min-height:2px; background:var(--color-success-500);"></div>
								{/if}
								{#if total === 0}
									<div class="w-full" style="height:100%; background:var(--color-surface-700);"></div>
								{/if}
							</div>
						</div>
						<span class="text-[9px] text-[var(--color-text-muted)]">
							{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
						</span>
					</div>
				{/each}
			</div>
			<div class="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
				<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[var(--color-success-500)]"></span>Correct</span>
				<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[var(--color-warning-400)]"></span>Partial</span>
				<span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[var(--color-error-500)]"></span>Incorrect</span>
			</div>
		</div>

		<!-- Leitner boxes (leitner only) -->
		{#if settings.defaultAlgorithm === 'leitner'}
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Leitner Boxes</span>
				<div class="grid grid-cols-5 gap-2">
					{#each [1, 2, 3, 4, 5] as box, i}
						<div class="flex flex-col items-center gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] px-2 py-3">
							<span class="text-xs font-semibold text-[var(--color-text-muted)]">Box {box}</span>
							<span class="text-lg font-bold" style="color:{BOX_COLORS[i]}">{leitnerBoxCounts[i]}</span>
							<span class="text-[9px] text-center text-[var(--color-text-muted)] leading-tight">{BOX_INTERVALS_LABELS[i]}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{/if}
	{/if}
</div>
