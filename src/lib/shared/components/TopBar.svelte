<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout, getCurrentUser } from '$lib/auth/authService';
	import { searchEverything } from '$lib/search/fullTextSearchService';
	import type { SearchResultItem, SearchResults } from '$lib/search/searchTypes';

	interface Props {
		onMenuToggle: () => void;
	}

	let { onMenuToggle }: Props = $props();
	const user = getCurrentUser();

	function handleLogout() { logout(); goto('/auth/login'); }

	let searchOpen = $state(false);
	let query = $state('');
	let results = $state<SearchResults | null>(null);
	let searching = $state(false);
	let inputEl: HTMLInputElement;
	let wrapperEl: HTMLDivElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	const MAX_PER_GROUP = 3;

	const grouped = $derived.by(() => {
		if (!results) return [];
		return [
			{ label: 'Textbooks', items: results.textbooks.slice(0, MAX_PER_GROUP) },
			{ label: 'Chapters', items: results.chapters.slice(0, MAX_PER_GROUP) },
			{ label: 'Content', items: results.blocks.slice(0, MAX_PER_GROUP) },
			{ label: 'Flashcard Decks', items: results.categories.slice(0, MAX_PER_GROUP) },
			{ label: 'Flashcards', items: results.flashcards.slice(0, MAX_PER_GROUP) },
		].filter((g) => g.items.length > 0);
	});

	const totalResults = $derived(results
		? results.textbooks.length + results.chapters.length + results.blocks.length +
		  results.categories.length + results.flashcards.length
		: 0);

	function openSearch() {
		searchOpen = true;
		setTimeout(() => inputEl?.focus(), 50);
	}

	function closeSearch() {
		searchOpen = false;
		query = '';
		results = null;
	}

	function handleInput() {
		clearTimeout(debounceTimer);
		if (!query.trim()) { results = null; return; }
		debounceTimer = setTimeout(async () => {
			searching = true;
			try { results = await searchEverything(query); }
			catch { results = null; }
			finally { searching = false; }
		}, 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeSearch();
		if (e.key === 'Enter' && query.trim()) {
			goto(`/viewer/search?q=${encodeURIComponent(query.trim())}`);
			closeSearch();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (wrapperEl && !wrapperEl.contains(e.target as Node)) closeSearch();
	}

	function navigate(path: string) {
		goto(path);
		closeSearch();
	}
</script>

<svelte:window onclick={handleClickOutside} />

<header
	class="fixed left-0 right-0 top-0 z-10 flex h-16 items-center gap-3
	       border-b border-[var(--color-surface-700)] bg-[var(--color-surface-900)]/95
	       px-4 backdrop-blur-sm lg:left-64"
>
	<!-- Mobile menu toggle (always left) -->
	<button
		onclick={onMenuToggle}
		aria-label="Toggle menu"
		class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
		       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-800)]
		       hover:text-[var(--color-text-primary)] transition-colors lg:hidden"
	>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
			<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	<!-- Search area — expands when open, icon only when closed -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative {searchOpen ? 'flex-1' : 'hidden lg:flex lg:flex-1 lg:justify-end'}"
		bind:this={wrapperEl}
		onclick={(e) => e.stopPropagation()}
	>
		{#if searchOpen}
			<div class="flex items-center gap-2 rounded-xl border border-[var(--color-accent-500)]/40
			            bg-[var(--color-surface-800)] px-3 py-2 w-full max-w-xl">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
				     class="shrink-0 text-[var(--color-text-muted)]">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={handleInput}
					onkeydown={handleKeydown}
					type="search"
					placeholder="Search everything…"
					class="flex-1 bg-transparent text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)] focus:outline-none"
				/>
				{#if searching}
					<svg class="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none"
					     stroke="currentColor" stroke-width="2" stroke-linecap="round"
					     style="color: var(--color-accent-400);">
						<path d="M21 12a9 9 0 11-6.219-8.56"/>
					</svg>
				{:else}
					<button onclick={closeSearch} aria-label="Close search"
						class="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				{/if}
			</div>

			<!-- Dropdown results -->
			{#if query.trim() && !searching}
				<div class="absolute left-0 top-full mt-2 w-full max-w-xl max-h-[70vh] overflow-y-auto
				            rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]
				            shadow-2xl z-50">
					{#if grouped.length === 0}
						<div class="px-4 py-6 text-center">
							<p class="text-sm text-[var(--color-text-muted)]">No results for "{query}"</p>
						</div>
					{:else}
						{#each grouped as group}
							<div class="px-3 pt-3 pb-1">
								<p class="px-1 pb-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
									{group.label}
								</p>
								{#each group.items as item (item.id)}
									<button
										onclick={() => navigate(item.navigationPath)}
										class="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left
										       hover:bg-[var(--color-surface-800)] transition-colors"
									>
										<div class="shrink-0 flex h-6 w-6 items-center justify-center rounded mt-0.5"
										     style="background: color-mix(in srgb, var(--color-accent-500) 12%, transparent);">
											{#if item.type === 'textbook'}
												<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
											{:else if item.type === 'chapter' || item.type === 'block'}
												<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
											{:else if item.type === 'category'}
												<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)"><rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/></svg>
											{:else}
												<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="color:var(--color-accent-400)"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
											{/if}
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm text-[var(--color-text-primary)] truncate">{item.title}</p>
											{#if item.subtitle}
												<p class="text-xs text-[var(--color-text-muted)] truncate">{item.subtitle}</p>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{/each}
						<div class="border-t border-[var(--color-surface-700)] p-3">
							<button
								onclick={() => { goto(`/viewer/search?q=${encodeURIComponent(query)}`); closeSearch(); }}
								class="w-full rounded-lg py-2 text-sm text-[var(--color-accent-400)]
								       hover:bg-[var(--color-surface-800)] transition-colors"
							>
								See all {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
							</button>
						</div>
					{/if}
				</div>
			{/if}

		{:else}
			<!-- Desktop: search icon button -->
			<button
				onclick={openSearch}
				aria-label="Search"
				class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Right side: user name + search (mobile) + logout -->
	<div class="flex shrink-0 items-center gap-2 ml-auto lg:ml-0">
		{#if !searchOpen}
			{#if user}
				<span class="hidden text-sm text-[var(--color-text-secondary)] sm:block">
					{user.name || user.email}
				</span>
			{/if}

			<!-- Mobile search button — right side, next to logout -->
			<button
				onclick={openSearch}
				aria-label="Search"
				class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
				       transition-colors lg:hidden"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
			</button>

			<button
				onclick={handleLogout}
				class="flex items-center gap-2 rounded-lg border border-[var(--color-surface-600)]
				       px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors
				       hover:border-[var(--color-surface-500)] hover:text-[var(--color-text-primary)]"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
					<polyline points="16 17 21 12 16 7"/>
					<line x1="21" y1="12" x2="9" y2="12"/>
				</svg>
				Log out
			</button>
		{/if}
	</div>
</header>
