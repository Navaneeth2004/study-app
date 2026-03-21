<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listMyCategories, listFlashcardsByCategory } from '$lib/viewer/viewerService';
	import { getCurrentUser } from '$lib/auth/authService';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import ViewerDeckCard from '$lib/viewer/components/ViewerDeckCard.svelte';

	interface DeckItem {
		id: string;
		name: string;
		description: string;
		cardCount: number;
		href: string;
		isOwn: boolean;
		authorName: string;
	}

	const user = getCurrentUser();

	let decks = $state<DeckItem[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		loading = true;
		try {
			const categories = await listMyCategories();
			const items = await Promise.all(
				categories.map(async (cat) => {
					const cards = await listFlashcardsByCategory(cat.id);
					return {
						id: cat.id,
						name: cat.name,
						description: cat.description ?? '',
						cardCount: cards.length,
						href: `/viewer/flashcards/category/${cat.id}`,
						isOwn: cat.owner === user?.id,
						authorName: cat.ownerName ?? ''
					};
				})
			);
			decks = items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load decks.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Flashcard Decks — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<nav class="flex items-center gap-2 text-sm">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">Flashcards</span>
	</nav>

	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Flashcard Decks</h1>
		<p class="text-[var(--color-text-secondary)]">Your solo flashcard categories.</p>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _}
				<div class="h-24 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
			{/each}
		</div>
	{:else if decks.length === 0}
		<EmptyState heading="No flashcard decks yet" description="Create flashcard categories in Creator mode." />
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each decks as deck (deck.id)}
				<ViewerDeckCard
					name={deck.name}
					subtitle={deck.description}
					cardCount={deck.cardCount}
					isOwn={deck.isOwn}
					authorName={deck.authorName}
					onClick={() => goto(deck.href)}
				/>
			{/each}
		</div>
	{/if}
</div>
