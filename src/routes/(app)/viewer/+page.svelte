<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		listMyTextbooks, listChapters, listMyCategories,
		listFlashcardsByCategory
	} from '$lib/viewer/viewerService';
	import ViewerTextbookCard from '$lib/viewer/components/ViewerTextbookCard.svelte';
	import ViewerDeckCard from '$lib/viewer/components/ViewerDeckCard.svelte';
	import { getCurrentUser } from '$lib/auth/authService';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	interface TextbookWithCount extends Textbook { chapterCount: number }
	interface DeckItem { id: string; name: string; subtitle: string; cardCount: number; href: string; isOwn: boolean; authorName: string }

	const user = getCurrentUser();

	let textbooks = $state<TextbookWithCount[]>([]);
	let decks = $state<DeckItem[]>([]);
	let loadingTextbooks = $state(true);
	let loadingDecks = $state(true);
	let error = $state('');

	onMount(async () => {
		await Promise.all([loadTextbooks(), loadDecks()]);
	});

	async function loadTextbooks() {
		loadingTextbooks = true;
		try {
			const books = await listMyTextbooks();
			textbooks = await Promise.all(
				books.map(async (book) => {
					const chapters = await listChapters(book.id);
					return { ...book, chapterCount: chapters.length };
				})
			);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbooks.';
		} finally {
			loadingTextbooks = false;
		}
	}

	async function loadDecks() {
		loadingDecks = true;
		try {
			const categories = await listMyCategories();
			const items: DeckItem[] = await Promise.all(
				categories.map(async (cat: FlashcardCategory) => {
					const cards = await listFlashcardsByCategory(cat.id);
					return {
						id: cat.id,
						name: cat.name,
						subtitle: cat.description ?? '',
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
			loadingDecks = false;
		}
	}
</script>

<svelte:head>
	<title>Home — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-10">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">
			Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
		</h1>
		<p class="text-[var(--color-text-secondary)]">Continue where you left off.</p>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	<!-- Textbooks section -->
	<section class="flex flex-col gap-4">
		<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
			My Textbooks
		</h2>
		{#if loadingTextbooks}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(3) as _}
					<div class="h-24 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
				{/each}
			</div>
		{:else if textbooks.length === 0}
			<EmptyState heading="No textbooks yet" description="Your textbooks will appear here." />

		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each textbooks as book (book.id)}
					<ViewerTextbookCard
						textbook={book}
						chapterCount={book.chapterCount}
						isOwn={book.owner === user?.id}
						authorName={book.ownerName ?? ''}
						onClick={() => goto(`/viewer/textbooks/${book.id}`)}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Flashcard Decks section -->
	<section class="flex flex-col gap-4">
		<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
			Flashcard Decks
		</h2>
		{#if loadingDecks}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(3) as _}
					<div class="h-24 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]"></div>
				{/each}
			</div>
		{:else if decks.length === 0}
			<EmptyState heading="No flashcard decks yet" description="Your flashcard categories will appear here." />
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each decks as deck (deck.id + deck.href)}
					<ViewerDeckCard
						name={deck.name}
						subtitle={deck.subtitle}
						cardCount={deck.cardCount}
						isOwn={deck.isOwn}
						authorName={deck.authorName}
						onClick={() => goto(deck.href)}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>
