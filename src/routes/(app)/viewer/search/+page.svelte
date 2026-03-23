<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { searchOwn } from '$lib/search/fullTextSearchService';
	import {
		getSharedTextbooks, getSharedCategories,
		installContent, uninstallContent, getMyInstalls
	} from '$lib/sharing/sharingService';
	import SearchTextbookCard from '$lib/viewer/components/search/SearchTextbookCard.svelte';
	import SearchDeckCard from '$lib/viewer/components/search/SearchDeckCard.svelte';
	import SearchResultGroup from '$lib/search/components/SearchResultGroup.svelte';
	import { pb } from '$lib/shared/pocketbase';
	import { searchUsers, isFollowing, followUser, unfollowUser } from '$lib/profile/profileService';
	import UserSearchCard from '$lib/profile/components/UserSearchCard.svelte';
	import type { PublicProfile } from '$lib/profile/profileTypes';
	import type { SearchResults } from '$lib/search/searchTypes';
	import type { SharedTextbook, SharedCategory, Install } from '$lib/sharing/sharingTypes';

	type Mode = 'my' | 'universal' | 'people';

	function getMyId(): string { return (pb.authStore.record?.id as string) ?? ''; }

	let query = $state('');
	let mode = $state<'my' | 'universal' | 'people'>('my');
	let myResults = $state<SearchResults | null>(null);
	let sharedTextbooks = $state<SharedTextbook[]>([]);
	let sharedCategories = $state<SharedCategory[]>([]);
	let installs = $state<Install[]>([]);
	let searching = $state(false);
	let error = $state('');
	let peopleResults = $state<PublicProfile[]>([]);
	let peopleFollowMap = $state<Map<string, string | null>>(new Map());
	let inputEl: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	onMount(async () => {
		inputEl?.focus();
		installs = await getMyInstalls().catch(() => []);
		const urlQ = $page.url.searchParams.get('q');
		if (urlQ) { query = urlQ; await runSearch(urlQ, mode); }
	});

	function getInstallId(contentId: string): string | null {
		return installs.find((i) => i.contentId === contentId)?.id ?? null;
	}

	$effect(() => {
		clearTimeout(debounceTimer);
		const q = query; const m = mode;
		debounceTimer = setTimeout(() => runSearch(q, m), 300);
	});

	async function runSearch(q: string, m: Mode) {
		if (!q.trim() && m !== 'people') { myResults = null; sharedTextbooks = []; sharedCategories = []; peopleResults = []; peopleFollowMap = new Map(); return; }
		searching = true; error = '';
		try {
			if (m === 'my') {
				myResults = await searchOwn(q);
			} else if (m === 'universal') {
				[sharedTextbooks, sharedCategories] = await Promise.all([
					getSharedTextbooks(q),
					getSharedCategories(q)
				]);
				sharedTextbooks = sharedTextbooks.filter((t) => t.owner !== getMyId());
				sharedCategories = sharedCategories.filter((c) => c.owner !== getMyId());
			} else {
				// People search
				peopleResults = await searchUsers(q);
				const map = new Map<string, string | null>();
				await Promise.all(peopleResults.map(async (p) => {
					const fid = await isFollowing(p.id);
					map.set(p.id, fid);
				}));
				peopleFollowMap = map;
			}
		} catch (e) { error = e instanceof Error ? e.message : 'Search failed.'; }
		finally { searching = false; }
	}

	async function handleFollowPerson(profile: PublicProfile) {
		try {
			const f = await followUser(profile.id);
			peopleFollowMap = new Map([...peopleFollowMap, [profile.id, f.id]]);
		} catch { /* silent */ }
	}

	async function handleUnfollowPerson(profile: PublicProfile) {
		const fid = peopleFollowMap.get(profile.id);
		if (!fid) return;
		try {
			await unfollowUser(fid);
			peopleFollowMap = new Map([...peopleFollowMap, [profile.id, null]]);
		} catch { /* silent */ }
	}

	async function handleInstallTextbook(item: SharedTextbook) {
		try { const i = await installContent('textbook', item.id); installs = [...installs, i]; }
		catch (e) { error = e instanceof Error ? e.message : 'Could not install.'; }
	}
	async function handleUninstallTextbook(item: SharedTextbook) {
		const id = getInstallId(item.id); if (!id) return;
		try { await uninstallContent(id); installs = installs.filter((i) => i.id !== id); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not remove.'; }
	}
	async function handleInstallCategory(item: SharedCategory) {
		try { const i = await installContent('flashcard_category', item.id); installs = [...installs, i]; }
		catch (e) { error = e instanceof Error ? e.message : 'Could not install.'; }
	}
	async function handleUninstallCategory(item: SharedCategory) {
		const id = getInstallId(item.id); if (!id) return;
		try { await uninstallContent(id); installs = installs.filter((i) => i.id !== id); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not remove.'; }
	}

	const hasMyResults = $derived(myResults &&
		(myResults.textbooks.length + myResults.chapters.length + myResults.blocks.length +
		 myResults.categories.length + myResults.flashcards.length) > 0);
	const hasUniversal = $derived(sharedTextbooks.length > 0 || sharedCategories.length > 0);
</script>

<svelte:head><title>Search — StudyApp</title></svelte:head>

<div class="flex flex-col gap-6 max-w-2xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Search</h1>
	</div>

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

	<div class="flex gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-1">
		<button onclick={() => (mode = 'my')}
			class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors
			       {mode === 'my' ? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
			My Content
		</button>
		<button onclick={() => (mode = 'universal')}
			class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors
			       {mode === 'universal' ? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
			Universal
		</button>
		<button
			onclick={() => (mode = 'people')}
			class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors
			       {mode === 'people' ? 'bg-[var(--color-accent-500)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
		>
			People
		</button>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	{#if searching}
		<div class="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
			<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--color-accent-400)"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
			Searching…
		</div>
	{:else if !query.trim()}
		<p class="text-sm text-[var(--color-text-muted)]">
			{mode === 'my' ? 'Search across all your textbooks, chapters, flashcards and more.' : 'Discover shared content from all users. Click any result to view — install to save to your library.'}
		</p>

	{:else if mode === 'my'}
		{#if !hasMyResults}
			<p class="text-sm text-[var(--color-text-muted)]">No content found for "{query}".</p>
		{:else if myResults}
			<div class="flex flex-col gap-6">
				<SearchResultGroup title="Textbooks" items={myResults.textbooks} />
				<SearchResultGroup title="Chapters" items={myResults.chapters} />
				<SearchResultGroup title="Content" items={myResults.blocks} />
				<SearchResultGroup title="Flashcard Decks" items={myResults.categories} />
				<SearchResultGroup title="Flashcards" items={myResults.flashcards} />
			</div>
		{/if}

	{:else if mode === 'people'}
		{#if !query.trim()}
			<p class="text-sm text-[var(--color-text-muted)]">Search for users by name.</p>
		{:else if peopleResults.length === 0 && !searching}
			<p class="text-sm text-[var(--color-text-muted)]">No users found for "{query}".</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each peopleResults as person (person.id)}
					<UserSearchCard
						profile={person}
						isFollowing={!!peopleFollowMap.get(person.id)}
						onFollow={() => handleFollowPerson(person)}
						onUnfollow={() => handleUnfollowPerson(person)}
						onNavigate={() => goto(`/profile/${person.id}`)}
					/>
				{/each}
			</div>
		{/if}

	{:else}
		{#if !hasUniversal}
			<p class="text-sm text-[var(--color-text-muted)]">No shared content found for "{query}".</p>
		{/if}

		{#if sharedTextbooks.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Shared Textbooks</h2>
				<div class="flex flex-col gap-2">
					{#each sharedTextbooks as item (item.id)}
						{@const iid = getInstallId(item.id)}
						<SearchTextbookCard
							{item} installId={iid} universal={true}
							onInstall={() => handleInstallTextbook(item)}
							onUninstall={() => handleUninstallTextbook(item)}
							onClick={() => goto(`/viewer/textbooks/${item.id}`)}
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
							{item} installId={iid} universal={true}
							onInstall={() => handleInstallCategory(item)}
							onUninstall={() => handleUninstallCategory(item)}
							onClick={() => goto(`/viewer/flashcards/category/${item.id}`)}
						/>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
