<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/shared/pocketbase';
	import { getCurrentUser } from '$lib/auth/authService';
	import ViewerTextbookCard from '$lib/viewer/components/ViewerTextbookCard.svelte';
	import ViewerDeckCard from '$lib/viewer/components/ViewerDeckCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';

	interface TextbookItem {
		id: string; title: string; description: string; owner: string;
		created: string; updated: string; chapterCount: number;
		isOwn: boolean; authorName: string; isFork: boolean; forkedFromAuthor: string;
	}
	interface DeckItem {
		id: string; name: string; subtitle: string; cardCount: number;
		href: string; isOwn: boolean; authorName: string;
		isFork: boolean; forkedFromAuthor: string;
	}

	const user = getCurrentUser();
	const uid = user?.id ?? '';

	let textbooks = $state<TextbookItem[]>([]);
	let decks = $state<DeckItem[]>([]);
	let loadingTextbooks = $state(true);
	let loadingDecks = $state(true);
	let error = $state('');

	/** Fetch a user's display name — direct lookup bypasses API rule expand restrictions */
	async function getUserName(userId: string): Promise<string> {
		if (!userId) return '';
		try {
			const r = await pb.collection('users').getOne(userId, { requestKey: null });
			return (r.name as string) || (r.email as string) || '';
		} catch {
			return '';
		}
	}

	onMount(async () => {
		await Promise.all([loadTextbooks(), loadDecks()]);
	});

	async function loadTextbooks() {
		loadingTextbooks = true;
		try {
			const own = await pb.collection('textbooks').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, sort: '-created'
			});
			const installs = await pb.collection('installs').getFullList({
				requestKey: null, filter: `user = "${uid}" && contentType = "textbook"`
			});
			const installedIds = installs.map((i) => i.contentId as string);
			const installedRaw = installedIds.length > 0
				? await Promise.all(installedIds.map((id) =>
					pb.collection('textbooks').getOne(id, { requestKey: null }).catch(() => null)
				))
				: [];

			const ownSet = new Set(own.map((r) => r.id as string));

			const items: TextbookItem[] = await Promise.all([
				...own.map(async (r) => {
					const chapters = await pb.collection('chapters').getFullList({
						requestKey: null, filter: `textbook = "${r.id}"`, fields: 'id'
					});
					return {
						id: r.id as string,
						title: r.title as string,
						description: (r.description as string) ?? '',
						owner: r.owner as string,
						created: r.created as string,
						updated: r.updated as string,
						chapterCount: chapters.length,
						isOwn: true,
						authorName: '',
						isFork: !!(r.forkedFrom as string),
						forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
					};
				}),
				...installedRaw
					.filter((r): r is NonNullable<typeof r> => r !== null && !ownSet.has(r.id as string))
					.map(async (r) => {
						const [chapters, ownerName] = await Promise.all([
							pb.collection('chapters').getFullList({
								requestKey: null, filter: `textbook = "${r.id}"`, fields: 'id'
							}),
							getUserName(r.owner as string)
						]);
						return {
							id: r.id as string,
							title: r.title as string,
							description: (r.description as string) ?? '',
							owner: r.owner as string,
							created: r.created as string,
							updated: r.updated as string,
							chapterCount: chapters.length,
							isOwn: false,
							authorName: ownerName,
							isFork: !!(r.forkedFrom as string),
							forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
						};
					})
			]);
			textbooks = items;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbooks.';
		} finally {
			loadingTextbooks = false;
		}
	}

	async function loadDecks() {
		loadingDecks = true;
		try {
			const own = await pb.collection('flashcard_categories').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, sort: 'name'
			});
			const installs = await pb.collection('installs').getFullList({
				requestKey: null, filter: `user = "${uid}" && contentType = "flashcard_category"`
			});
			const installedIds = installs.map((i) => i.contentId as string);
			const installedRaw = installedIds.length > 0
				? await Promise.all(installedIds.map((id) =>
					pb.collection('flashcard_categories').getOne(id, { requestKey: null }).catch(() => null)
				))
				: [];

			const ownSet = new Set(own.map((r) => r.id as string));

			const items: DeckItem[] = await Promise.all([
				...own.map(async (r) => {
					const cards = await pb.collection('flashcards').getFullList({
						requestKey: null, filter: `category = "${r.id}"`, fields: 'id'
					});
					return {
						id: r.id as string,
						name: r.name as string,
						subtitle: (r.description as string) ?? '',
						cardCount: cards.length,
						href: `/viewer/flashcards/category/${r.id}`,
						isOwn: true,
						authorName: '',
						isFork: !!(r.forkedFrom as string),
						forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
					};
				}),
				...installedRaw
					.filter((r): r is NonNullable<typeof r> => r !== null && !ownSet.has(r.id as string))
					.map(async (r) => {
						const [cards, ownerName] = await Promise.all([
							pb.collection('flashcards').getFullList({
								requestKey: null, filter: `category = "${r.id}"`, fields: 'id'
							}),
							getUserName(r.owner as string)
						]);
						return {
							id: r.id as string,
							name: r.name as string,
							subtitle: (r.description as string) ?? '',
							cardCount: cards.length,
							href: `/viewer/flashcards/category/${r.id}`,
							isOwn: false,
							authorName: ownerName,
							isFork: !!(r.forkedFrom as string),
							forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
						};
					})
			]);
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
						authorName={book.authorName}
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
				{#each decks as deck (deck.id)}
					<ViewerDeckCard
						name={deck.name}
						subtitle={deck.subtitle}
						cardCount={deck.cardCount}
						isOwn={deck.isOwn}
						authorName={deck.authorName}
						isFork={deck.isFork}
						forkedFromAuthor={deck.forkedFromAuthor}
						onClick={() => goto(deck.href)}
					/>
				{/each}
			</div>
		{/if}
	</section>
</div>
