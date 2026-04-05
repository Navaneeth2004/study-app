<script lang="ts">
	import { onMount } from 'svelte';
	import {
		isBookmarked, createBookmark, deleteBookmark, listFolders
	} from '$lib/bookmarks/bookmarkService';
	import type { BookmarkContentType, BookmarkFolder } from '$lib/bookmarks/bookmarkTypes';

	interface Props {
		contentType: BookmarkContentType;
		contentId: string;
		contentTitle: string;
		contentSubtitle?: string;
		contentMeta?: Record<string, string>;
	}
	let { contentType, contentId, contentTitle, contentSubtitle = '', contentMeta = {} }: Props = $props();

	let bookmarkId = $state<string | null>(null);
	let loading = $state(true);
	let showFolderPicker = $state(false);
	let showConfirm = $state(false);
	let folders = $state<BookmarkFolder[]>([]);
	let working = $state(false);
	let buttonEl = $state<HTMLButtonElement | undefined>(undefined);
	let wrapperEl: HTMLDivElement;

	onMount(async () => {
		try { bookmarkId = await isBookmarked(contentType, contentId); }
		finally { loading = false; }
	});

	async function openFolderPicker() {
		folders = await listFolders();
		showFolderPicker = true;
	}

	async function handleAdd(folderId: string | null) {
		showFolderPicker = false; working = true;
		try {
			const bm = await createBookmark({ contentType, contentId, contentTitle, contentSubtitle, contentMeta, folderId });
			bookmarkId = bm.id;
		} finally { working = false; }
	}

	async function handleRemove() {
		if (!bookmarkId) return; showConfirm = false; working = true;
		try { await deleteBookmark(bookmarkId); bookmarkId = null; }
		finally { working = false; }
	}

	function handleClick() {
		if (loading || working) return;
		if (bookmarkId) { showConfirm = !showConfirm; showFolderPicker = false; }
		else { openFolderPicker(); showConfirm = false; }
	}

	function handleClickOutside(e: MouseEvent) {
		if (wrapperEl && !wrapperEl.contains(e.target as Node)) {
			showFolderPicker = false; showConfirm = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={wrapperEl}>
	<button
		bind:this={buttonEl}
		onclick={handleClick}
		disabled={loading || working}
		aria-label={bookmarkId ? 'Remove bookmark' : 'Add bookmark'}
		class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors
		       {bookmarkId ? 'text-[var(--color-accent-400)] hover:bg-[var(--color-accent-500)]/10' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)]'}
		       disabled:opacity-40"
	>
		{#if bookmarkId}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
			</svg>
		{:else}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
			</svg>
		{/if}
	</button>

	<!-- Folder picker — opens ABOVE the button -->
	{#if showFolderPicker}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="absolute right-0 bottom-full mb-2 z-30 min-w-48 overflow-hidden rounded-xl border
		            border-[var(--color-surface-700)] bg-[var(--color-surface-800)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<p class="border-b border-[var(--color-surface-700)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
				Save to…
			</p>
			<button onclick={() => handleAdd(null)}
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
				</svg>
				No folder
			</button>
			{#each folders as folder}
				<button onclick={() => handleAdd(folder.id)}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
					</svg>
					{folder.name}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Remove confirm — opens ABOVE the button -->
	{#if showConfirm}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="absolute right-0 bottom-full mb-2 z-30 flex items-center gap-2 rounded-xl border
		            border-[var(--color-surface-700)] bg-[var(--color-surface-800)] px-3 py-2 shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<span class="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">Remove?</span>
			<button onclick={handleRemove} class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Yes</button>
			<button onclick={() => (showConfirm = false)} class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">No</button>
		</div>
	{/if}
</div>
