<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { searchMyTextbooks, searchMyCategories } from '$lib/viewer/searchService';
	import {
		getSharedTextbooks, getSharedCategories,
		installContent, uninstallContent, getMyInstalls
	} from '$lib/sharing/sharingService';
	import SearchTextbookCard from '$lib/viewer/components/search/SearchTextbookCard.svelte';
	import SearchDeckCard from '$lib/viewer/components/search/SearchDeckCard.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import { pb } from '$lib/shared/pocketbase';
	import type { Textbook } from '$lib/creator/creatorTypes';
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';
	import type { SharedTextbook, SharedCategory, Install } from '$lib/sharing/sharingTypes';

	type Mode = 'my' | 'universal';

	// Use pb.authStore directly so it's always current at filter time
	function getMyId(): string {
		return (pb.authStore.record?.id as string) ?? '';
	}

	let query = $state('');
	let mode = $state<Mode>('my');
	let myTextbooks = $state<Textbook[]>([]);
	let myCategories = $state<FlashcardCategory[]>([]);
	let sharedTextbooks = $state<SharedTextbook[]>([]);
	let sharedCategories = $state<SharedCategory[]>([]);
	let installs = $state<Install[]>([]);
	let searching = $state(false);
	let error = $state('');
	let inputEl: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	onMount(async () => {
		inputEl?.focus();
		installs = await getMyInstalls().catch(() => []);
	});

	function getInstallId(contentId: string): string | null {
		return installs.find((i) => i.contentId === contentId)?.id ?? null;
	}

	$effect(() => {
		clearTimeout(debounceTimer);
		const q = query;
		const m = mode;
		debounceTimer = setTimeout(() => runSearch(q, m), 300);
	});

	async function runSearch(q: string, m: Mode) {
		if (!q.trim()) {
			myTextbooks = [];
			myCategories = [];
			sharedTextbooks = [];
			sharedCategories = [];
			return;
		}
		searching = true;
		error = '';
		try {
			if (m === 'my') {
				[myTextbooks, myCategories] = await Promise.all([
					searchMyTextbooks(q),
					searchMyCategories(q)
				]);
			} else {
				[sharedTextbooks, sharedCategories] = await Promise.all([
					getSharedTextbooks(q),
					getSharedCategories(q)
				]);
				// Filter out own content — user already owns it
				sharedTextbooks = sharedTextbooks.filter((t) => t.owner !== getMyId());
				sharedCategories = sharedCategories.filter((c) => c.owner !== getMyId());
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Search failed.';
		} finally {
			searching = false;
		}
	}

	async function handleInstallTextbook(item: SharedTextbook) {
		try {
			const install = await installContent('textbook', item.id);
			installs = [...installs, install];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not install.';
		}
	}

	async function handleUninstallTextbook(item: SharedTextbook) {
		const installId = getInstallId(item.id);
		if (!installId) return;
		try {
			await uninstallContent(installId);
			installs = installs.filter((i) => i.id !== installId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not remove.';
		}
	}

	async function handleInstallCategory(item: SharedCategory) {
		try {
			const install = await installContent('flashcard_category', item.id);
			installs = [...installs, install];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not install.';
		}
	}

	async function handleUninstallCategory(item: SharedCategory) {
		const installId = getInstallId(item.id);
		if (!installId) return;
		try {
			await uninstallContent(installId);
			installs = installs.filter((i) => i.id !== installId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not remove.';
		}
	}

	const hasMyResults = $derived(myTextbooks.length > 0 || myCategories.length > 0);
	const hasUniversalResults = $derived(sharedTextbooks.length > 0 || sharedCategories.length > 0);
</script>

<svelte:head>
	<title>Search — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Search</h1>
	</div>

	<!-- Search input -->
	<div class="relative">
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
		     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
		     class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
			<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
		</svg>
		<input
			bind:this={inputEl}
			bind:value={query}
			type="search"
			placeholder="Search…"
			class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-900)]
			       py-2.5 pl-10 pr-4 text-sm text-[var(--color-text-primary)]
			       placeholder:text-[var(--color-text-muted)] focus:outline-none
			       focus:border-[var(--color-accent-500)] transition-colors"
		/>
	</div>

	<!-- Mode toggle -->
	<div class="flex gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-1">
		<button
			onclick={() => (mode = 'my')}
			class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors
			       {mode === 'my'
				? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)]'
				: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
		>
			My Content
		</button>
		<button
			onclick={() => (mode = 'universal')}
			class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors
			       {mode === 'universal'
				? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)]'
				: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
		>
			Universal Search
		</button>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}

	{#if searching}
		<p class="text-sm text-[var(--color-text-muted)]">Searching…</p>

	{:else if !query.trim()}
		<p class="text-sm text-[var(--color-text-muted)]">
			{mode === 'my' ? 'Search your textbooks and flashcard decks.' : 'Discover shared content from all users.'}
		</p>

	{:else if mode === 'my'}
		{#if !hasMyResults}
			<p class="text-sm text-[var(--color-text-muted)]">No content found for "{query}".</p>
		{/if}

		{#if myTextbooks.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Textbooks</h2>
				<div class="flex flex-col gap-2">
					{#each myTextbooks as item (item.id)}
						<SearchTextbookCard
							item={{ id: item.id, title: item.title, description: item.description,
							        shareTitle: item.title, shareDescription: item.description,
							        owner: item.owner, ownerName: '', created: item.created }}
							installId={null}
							universal={false}
							onClick={() => goto(`/viewer/textbooks/${item.id}`)}
						/>
					{/each}
				</div>
			</section>
		{/if}

		{#if myCategories.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Flashcard Decks</h2>
				<div class="flex flex-col gap-2">
					{#each myCategories as item (item.id)}
						<SearchDeckCard
							{item}
							installId={null}
							universal={false}
							onClick={() => goto(`/viewer/flashcards/category/${item.id}`)}
						/>
					{/each}
				</div>
			</section>
		{/if}

	{:else}
		<!-- Universal search -->
		{#if !hasUniversalResults}
			<p class="text-sm text-[var(--color-text-muted)]">No shared content found for "{query}".</p>
		{/if}

		{#if sharedTextbooks.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Shared Textbooks</h2>
				<div class="flex flex-col gap-2">
					{#each sharedTextbooks as item (item.id)}
						{@const iid = getInstallId(item.id)}
						<SearchTextbookCard
							{item}
							installId={iid}
							universal={true}
							onInstall={() => handleInstallTextbook(item)}
							onUninstall={() => handleUninstallTextbook(item)}
							onClick={iid ? () => goto(`/viewer/textbooks/${item.id}`) : undefined}
						/>
					{/each}
				</div>
			</section>
		{/if}

		{#if sharedCategories.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Shared Flashcard Decks</h2>
				<div class="flex flex-col gap-2">
					{#each sharedCategories as item (item.id)}
						{@const iid = getInstallId(item.id)}
						<SearchDeckCard
							{item}
							installId={iid}
							universal={true}
							onInstall={() => handleInstallCategory(item)}
							onUninstall={() => handleUninstallCategory(item)}
							onClick={iid ? () => goto(`/viewer/flashcards/category/${item.id}`) : undefined}
						/>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
