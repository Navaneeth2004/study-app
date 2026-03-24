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
	import { pb } from '$lib/shared/pocketbase';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	interface TextbookWithCount extends Textbook {
		chapterCount: number;
		isOwn: boolean;
		ownerName: string;
		isFork: boolean;
		forkedFromAuthor: string;
	}
	interface DeckItem {
		id: string; name: string; subtitle: string; cardCount: number;
		href: string; isOwn: boolean; authorName: string; ownerId?: string;
		isFork: boolean; forkedFromAuthor: string;
	}

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
			const uid = user?.id ?? '';
			// Step 1: load own textbooks (always fast, always works)
			const own = await pb.collection('textbooks').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, sort: '-created'
			});

			// Step 2: load installs (non-blocking if fails)
			let installedRecords: Array<Record<string, unknown>> = [];
			try {
				const installs = await pb.collection('installs').getFullList({
					requestKey: null, filter: `user = "${uid}" && contentType = "textbook"`
				});
				const ownSet = new Set(own.map((r) => r.id as string));
				const ids = installs.map((i) => i.contentId as string).filter((id) => !ownSet.has(id));
				if (ids.length > 0) {
					const results = await Promise.all(ids.map((id) =>
						pb.collection('textbooks').getOne(id, { requestKey: null, expand: 'owner' }).catch(() => null)
					));
					installedRecords = results.filter((r): r is Record<string, unknown> => r !== null);
				}
			} catch { /* installs fetch failed silently */ }

			const allRecords = [
				...own.map((r) => ({ r: r as Record<string, unknown>, isOwn: true, ownerName: user?.name || user?.email || '' })),
				...installedRecords.map((r) => ({
					r, isOwn: false,
					ownerName: ((r.expand?.owner as Record<string, unknown>)?.name as string) || 'Anonymous'
				}))
			];

			// Step 3: Show cards immediately with chapterCount 0, then update counts
			textbooks = allRecords.map(({ r, isOwn, ownerName }) => ({
				id: r.id as string, title: r.title as string,
				description: (r.description as string) ?? '',
				owner: r.owner as string, ownerName,
				created: r.created as string, updated: r.updated as string,
				chapterCount: 0, isOwn, isFork: !!(r.forkedFrom as string),
				forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
			}));
			loadingTextbooks = false; // Show cards NOW

			// Step 4: Load chapter counts in background (non-blocking)
			if (allRecords.length > 0) {
				try {
					const allTbIds = allRecords.map(({ r }) => r.id as string);
					const chaps = await pb.collection('chapters').getFullList({
						requestKey: null,
						filter: '(' + allTbIds.map((id) => `textbook = "${id}"`).join(' || ') + ')',
						fields: 'id,textbook'
					});
					const counts: Record<string, number> = {};
					for (const ch of chaps) {
						const tid = ch.textbook as string;
						counts[tid] = (counts[tid] ?? 0) + 1;
					}
					// Update counts without re-triggering skeleton
					textbooks = textbooks.map((t) => ({ ...t, chapterCount: counts[t.id] ?? 0 }));
				} catch { /* chapter counts are optional */ }
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbooks.';
			loadingTextbooks = false;
		}
	}

	async function loadDecks() {
		loadingDecks = true;
		try {
			const uid = user?.id ?? '';
			const own = await pb.collection('flashcard_categories').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, sort: 'name'
			});
			const installs = await pb.collection('installs').getFullList({
				requestKey: null, filter: `user = "${uid}" && contentType = "flashcard_category"`
			});
			const installedIds = installs.map((i) => i.contentId as string);
			const installedRecords = installedIds.length > 0
				? await Promise.all(installedIds.map((id) =>
					pb.collection('flashcard_categories').getOne(id, { requestKey: null, expand: 'owner' }).catch(() => null)
				))
				: [];

			const ownSet = new Set(own.map((r) => r.id as string));
			const allRecords = [
				...own.map((r) => ({ r, isOwn: true, ownerName: user?.name || user?.email || '' })),
				...installedRecords
					.filter((r): r is NonNullable<typeof r> => r !== null && !ownSet.has(r.id as string))
					.map((r) => ({
						r,
						isOwn: false,
						ownerName: ((r.expand?.owner as Record<string, unknown>)?.name as string) || 'Anonymous'
					}))
			];

			const allCatIds = allRecords.map(({ r }) => r.id as string);
			let cardCounts: Record<string, number> = {};
			if (allCatIds.length > 0) {
				try {
					const cards = await pb.collection('flashcards').getFullList({
						requestKey: null,
						filter: '(' + allCatIds.map((id) => `category = "${id}"`).join(' || ') + ')',
						fields: 'id,category'
					});
					for (const card of cards) {
						const cid = card.category as string;
						cardCounts[cid] = (cardCounts[cid] ?? 0) + 1;
					}
				} catch { /* silent */ }
			}

			const items: DeckItem[] = allRecords.map(({ r, isOwn, ownerName }) => ({
				id: r.id as string,
				name: r.name as string,
				subtitle: (r.description as string) ?? '',
				cardCount: cardCounts[r.id as string] ?? 0,
				href: `/viewer/flashcards/category/${r.id}`,
				isOwn,
				ownerId: r.owner as string,
				authorName: ownerName,
				isFork: !!(r.forkedFrom as string),
				forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
			}));
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
						isOwn={book.isOwn}
						authorName={book.ownerName ?? ''}
						isFork={book.isFork}
						forkedFromAuthor={book.forkedFromAuthor}
						onClick={() => goto(`/viewer/textbooks/${book.id}`)}
					/>
				{/each}
			</div>
		{/if}
	</section>

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
						ownerId={deck.ownerId ?? ''}
						isFork={deck.isFork}
						forkedFromAuthor={deck.forkedFromAuthor}
						onClick={() => goto(deck.href)}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>
