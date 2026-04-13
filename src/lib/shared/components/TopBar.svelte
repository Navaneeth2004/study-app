<script lang="ts">
	import { logout, getCurrentUser } from '$lib/auth/authService';
	import { searchEverything } from '$lib/search/fullTextSearchService';
	import type { SearchResultItem, SearchResults } from '$lib/search/searchTypes';
	import { goto } from '$app/navigation';

	interface Props {
		onMenuToggle: () => void;
	}

	let { onMenuToggle }: Props = $props();
	const user = getCurrentUser();

	let showLogoutModal = $state(false);
	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		logout();
		showLogoutModal = false;
		// Hard reload ensures all Svelte stores, PocketBase state, and cookies are fully reset
		window.location.href = '/auth/login';
	}

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

	function openSearch() { searchOpen = true; setTimeout(() => inputEl?.focus(), 50); }
	function closeSearch() { searchOpen = false; query = ''; results = null; }

	function handleOutsideClick(e: MouseEvent) {
		if (wrapperEl && !wrapperEl.contains(e.target as Node)) closeSearch();
	}

	$effect(() => {
		if (searchOpen) {
			document.addEventListener('mousedown', handleOutsideClick);
			return () => document.removeEventListener('mousedown', handleOutsideClick);
		}
	});

	$effect(() => {
		clearTimeout(debounceTimer);
		const q = query;
		if (!q.trim()) { results = null; return; }
		debounceTimer = setTimeout(async () => {
			searching = true;
			try { results = await searchEverything(q); }
			catch { results = null; }
			finally { searching = false; }
		}, 300);
	});

	function navigateTo(item: SearchResultItem) {
		closeSearch();
		goto(item.navigationPath);
	}
</script>

{#if showLogoutModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
	     onclick={() => (showLogoutModal = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-sm rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-6 shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex flex-col gap-5">
				<div class="flex flex-col gap-1.5">
					<h2 class="font-display text-lg text-[var(--color-text-primary)]">Log out?</h2>
					<p class="text-sm text-[var(--color-text-secondary)]">Are you sure you want to log out?</p>
				</div>
				<div class="flex flex-col gap-2">
					<button onclick={handleLogout} disabled={loggingOut}
						class="w-full rounded-xl bg-[var(--color-error-500)]/15 px-4 py-2.5 text-sm font-medium
						       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25
						       disabled:opacity-50 transition-colors">
						{loggingOut ? 'Logging out…' : 'Yes, log out'}
					</button>
					<button onclick={() => (showLogoutModal = false)}
						class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<header
	class="fixed left-0 right-0 top-0 z-10 flex h-16 items-center
	       border-b border-[var(--color-surface-700)] bg-[var(--color-surface-900)]/95
	       px-4 backdrop-blur-sm lg:left-64"
>
	<button onclick={onMenuToggle} aria-label="Toggle menu"
		class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
		       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors lg:hidden">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
			<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	<div class="flex flex-1 items-center justify-end lg:justify-start" bind:this={wrapperEl}>
		{#if searchOpen}
			<div class="relative flex w-full max-w-md items-center">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
				     class="absolute left-3 text-[var(--color-text-muted)] pointer-events-none">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
				<input bind:this={inputEl} bind:value={query} type="search" placeholder="Search everything…"
					class="w-full rounded-xl border border-[var(--color-accent-500)]/50 bg-[var(--color-surface-800)]
					       py-2 pl-9 pr-9 text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors" />
				<button onclick={closeSearch} aria-label="Close search"
					class="absolute right-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
				{#if query.trim()}
					<div class="absolute left-0 top-full mt-2 w-full rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-800)] shadow-2xl overflow-hidden z-30 max-h-80 overflow-y-auto">
						{#if searching}
							<div class="px-4 py-3 text-sm text-[var(--color-text-muted)]">Searching…</div>
						{:else if totalResults === 0}
							<div class="px-4 py-3 text-sm text-[var(--color-text-muted)]">No results for "{query}"</div>
						{:else}
							{#each grouped as group}
								<div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-surface-700)]">
									{group.label}
								</div>
								{#each group.items as item}
									<button onclick={() => navigateTo(item)}
										class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[var(--color-surface-700)] transition-colors">
										<span class="text-sm text-[var(--color-text-primary)] truncate">{item.title}</span>
										{#if item.excerpt}
											<span class="text-xs text-[var(--color-text-muted)] truncate">{item.excerpt}</span>
										{/if}
									</button>
								{/each}
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<button onclick={openSearch} aria-label="Search"
				class="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
			</button>
		{/if}
	</div>

	{#if !searchOpen}
		<div class="flex shrink-0 items-center gap-3 ml-auto">
			{#if user}
				<span class="hidden text-sm text-[var(--color-text-secondary)] sm:block">{user.name || user.email}</span>
			{/if}
			<button onclick={openSearch} aria-label="Search"
				class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
				       transition-colors lg:hidden">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
			</button>
			<button onclick={() => (showLogoutModal = true)}
				class="flex items-center gap-2 rounded-lg border border-[var(--color-surface-600)]
				       px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors
				       hover:border-[var(--color-surface-500)] hover:text-[var(--color-text-primary)]">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
					<polyline points="16 17 21 12 16 7"/>
					<line x1="21" y1="12" x2="9" y2="12"/>
				</svg>
				Log out
			</button>
		</div>
	{/if}
</header>
