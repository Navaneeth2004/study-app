<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCurrentUser } from '$lib/auth/authService';
	import { pb } from '$lib/shared/pocketbase';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import ViewerDeckCard from '$lib/viewer/components/ViewerDeckCard.svelte';

	interface DeckItem {
		id: string; name: string; description: string; cardCount: number;
		href: string; isOwn: boolean; authorName: string;
		isFork: boolean; forkedFromAuthor: string;
	}

	const user = getCurrentUser();
	const uid = user?.id ?? '';

	let decks = $state<DeckItem[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function getUserName(userId: string): Promise<string> {
		if (!userId) return '';
		try {
			const r = await pb.collection('users').getOne(userId, { requestKey: null });
			return (r.name as string) || (r.email as string) || '';
		} catch { return ''; }
	}

	onMount(async () => {
		loading = true;
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
						id: r.id as string, name: r.name as string,
						description: (r.description as string) ?? '',
						cardCount: cards.length,
						href: `/viewer/flashcards/category/${r.id}`,
						isOwn: true, authorName: '',
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
							id: r.id as string, name: r.name as string,
							description: (r.description as string) ?? '',
							cardCount: cards.length,
							href: `/viewer/flashcards/category/${r.id}`,
							isOwn: false, authorName: ownerName,
							isFork: !!(r.forkedFrom as string),
							forkedFromAuthor: (r.forkedFromAuthor as string) ?? ''
						};
					})
			]);
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
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Flashcard Decks</h1>
		<p class="text-[var(--color-text-secondary)]">Your solo flashcard categories.</p>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

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
					isFork={deck.isFork}
					forkedFromAuthor={deck.forkedFromAuthor}
					onClick={() => goto(deck.href)}
				/>
			{/each}
		</div>
	{/if}
</div>
