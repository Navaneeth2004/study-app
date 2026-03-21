<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { listFlashcardsByCategory, listMyCategories } from '$lib/viewer/viewerService';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';
	import FlashcardListItem from '$lib/viewer/components/FlashcardListItem.svelte';
	import FlashcardViewModal from '$lib/viewer/components/FlashcardViewModal.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import {
		quizSession, currentCard, isComplete, progress, summary,
		startQuiz, rateCard, restartWithFailed, resetQuiz
	} from '$lib/viewer/quizStore';
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import type { Rating } from '$lib/viewer/viewerTypes';

	const categoryId = $derived($page.params.categoryId as string);

	type Screen = 'browse' | 'select' | 'quiz' | 'results';

	let categoryName = $state('');
	let allCards = $state<Flashcard[]>([]);
	let selectedIds = $state<Set<string>>(new Set());
	let screen = $state<Screen>('browse');
	let viewingCard = $state<Flashcard | null>(null);
	let loading = $state(true);
	let error = $state('');

	const selectedCards = $derived(allCards.filter((c) => selectedIds.has(c.id)));
	const failedCount = $derived($summary.incorrect + $summary.partial);

	onMount(async () => {
		loading = true;
		resetQuiz();
		try {
			const [categories, cards] = await Promise.all([
				listMyCategories(),
				listFlashcardsByCategory(categoryId)
			]);
			categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'Flashcards';
			allCards = cards;
			selectedIds = new Set();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load flashcards.';
		} finally {
			loading = false;
		}
	});

	function toggleCard(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		selectedIds = next;
	}

	function selectAll() { selectedIds = new Set(allCards.map((c) => c.id)); }
	function deselectAll() { selectedIds = new Set(); }

	function handleStartQuiz() { startQuiz(selectedCards); screen = 'quiz'; }
	function handleRate(rating: Rating) { rateCard(rating); if ($isComplete) screen = 'results'; }
	function handleRetry() { restartWithFailed(); screen = 'quiz'; }
	function handleBackToDeck() { resetQuiz(); screen = 'browse'; }
</script>

<svelte:head>
	<title>{categoryName || 'Flashcards'} — StudyApp</title>
</svelte:head>

<FlashcardViewModal flashcard={viewingCard} onClose={() => (viewingCard = null)} />

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
		<div class="flex items-center justify-between gap-4">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">{categoryName}</h1>
			<button
				onclick={() => (screen = 'select')}
				class="shrink-0 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
				       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors"
			>
				Start Test
			</button>
		</div>
		<div class="flex flex-col gap-2">
			{#each allCards as card (card.id)}
				<FlashcardListItem flashcard={card} showCheckbox={false} onClick={(c) => (viewingCard = c)} />
			{/each}
		</div>

	{:else if screen === 'select'}
		<div class="flex items-center justify-between gap-4">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Select Cards</h1>
			<button onclick={() => { screen = 'browse'; selectedIds = new Set(); }}
				class="shrink-0 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				Cancel
			</button>
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
			class="w-full rounded-xl bg-[var(--color-accent-500)] py-3 text-sm font-medium
			       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
			       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
			Start Quiz ({selectedIds.size} {selectedIds.size === 1 ? 'card' : 'cards'})
		</button>

	{:else if screen === 'quiz'}
		<div style="display:flex; flex-direction:column; align-items:center; width:100%;">
			<div class="flex items-center justify-between gap-4">
				<span class="text-sm text-[var(--color-text-secondary)]">Card {$quizSession.currentIndex + 1} of {$quizSession.cards.length}</span>
				<button onclick={handleBackToDeck} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">Quit Quiz</button>
			</div>
			<div class="h-1.5 w-full rounded-full bg-[var(--color-surface-700)] overflow-hidden">
				<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300" style="width: {$progress}%"></div>
			</div>
			<div style="display:flex; flex-direction:column; align-items:center; width:100%; max-width:640px; gap:1rem;">
				{#if $currentCard}
					<div style="width:100%;">
						<FlipCard
							frontText={$currentCard.frontText}
							frontImageUrl={$currentCard.frontImageUrl}
							frontAudioUrl={$currentCard.frontAudioUrl}
							backText={$currentCard.backText}
							backImageUrl={$currentCard.backImageUrl}
							backAudioUrl={$currentCard.backAudioUrl}
						/>
					</div>
				{/if}
				<div class="grid grid-cols-3 gap-3" style="width:100%;">
					<button onclick={() => handleRate('incorrect')}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-error-500)]/30
						       bg-[var(--color-error-500)]/10 py-3 text-xs font-medium text-[var(--color-error-400)]
						       hover:bg-[var(--color-error-500)]/20 transition-colors">
						<span class="text-lg">✗</span>Incorrect
					</button>
					<button onclick={() => handleRate('partial')}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-warning-500)]/30
						       bg-[var(--color-warning-500)]/10 py-3 text-xs font-medium text-[var(--color-warning-400)]
						       hover:bg-[var(--color-warning-500)]/20 transition-colors">
						<span class="text-lg">~</span>Partial
					</button>
					<button onclick={() => handleRate('correct')}
						class="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-success-500)]/30
						       bg-[var(--color-success-500)]/10 py-3 text-xs font-medium text-[var(--color-success-500)]
						       hover:bg-[var(--color-success-500)]/20 transition-colors">
						<span class="text-lg">✓</span>Correct
					</button>
				</div>
			</div>
		</div>

	{:else if screen === 'results'}
		<div class="flex flex-col gap-6 rounded-xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-8 max-w-xl mx-auto w-full">
			<div class="flex flex-col gap-1 text-center">
				<h2 class="font-display text-2xl text-[var(--color-text-primary)]">Quiz Complete</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{$summary.total} cards studied</p>
			</div>
			<div class="flex h-3 w-full overflow-hidden rounded-full">
				{#if $summary.correct > 0}<div class="bg-[var(--color-success-500)]" style="width: {($summary.correct / $summary.total) * 100}%"></div>{/if}
				{#if $summary.partial > 0}<div class="bg-[var(--color-warning-400)]" style="width: {($summary.partial / $summary.total) * 100}%"></div>{/if}
				{#if $summary.incorrect > 0}<div class="bg-[var(--color-error-500)]" style="width: {($summary.incorrect / $summary.total) * 100}%"></div>{/if}
			</div>
			<div class="grid grid-cols-3 gap-3 text-center">
				<div class="flex flex-col gap-0.5">
					<span class="text-xl font-semibold text-[var(--color-success-500)]">{$summary.correct}</span>
					<span class="text-xs text-[var(--color-text-muted)]">Correct</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-xl font-semibold text-[var(--color-warning-400)]">{$summary.partial}</span>
					<span class="text-xs text-[var(--color-text-muted)]">Partial</span>
				</div>
				<div class="flex flex-col gap-0.5">
					<span class="text-xl font-semibold text-[var(--color-error-400)]">{$summary.incorrect}</span>
					<span class="text-xs text-[var(--color-text-muted)]">Incorrect</span>
				</div>
			</div>
			<div class="flex flex-col gap-3">
				<button onclick={handleRetry} disabled={failedCount === 0}
					class="w-full rounded-xl bg-[var(--color-accent-500)] py-2.5 text-sm font-medium
					       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
					       disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
					Retry Incorrect + Partial ({failedCount})
				</button>
				<button onclick={handleBackToDeck}
					class="w-full rounded-xl border border-[var(--color-surface-600)] py-2.5 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Back to Deck
				</button>
			</div>
		</div>
	{/if}
</div>
