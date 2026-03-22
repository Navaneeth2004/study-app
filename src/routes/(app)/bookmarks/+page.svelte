<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		listAllBookmarks, listFolders, createFolder, updateFolder,
		deleteFolder, reorderFolders, deleteBookmark, moveBookmark, reorderBookmarks
	} from '$lib/bookmarks/bookmarkService';
	import FolderPanel from '$lib/bookmarks/components/FolderPanel.svelte';
	import BookmarkList from '$lib/bookmarks/components/BookmarkList.svelte';
	import type { Bookmark, BookmarkFolder, GroupedBookmarks } from '$lib/bookmarks/bookmarkTypes';

	let grouped = $state<GroupedBookmarks[]>([]);
	let folders = $state<BookmarkFolder[]>([]);
	let selectedId = $state<string | 'all' | 'uncategorised'>('all');
	let loading = $state(true);
	let error = $state('');
	let showNewFolder = $state(false);
	let newFolderName = $state('');
	let creatingFolder = $state(false);

	const displayedBookmarks = $derived.by(() => {
		if (selectedId === 'all') return grouped.flatMap((g) => g.bookmarks);
		if (selectedId === 'uncategorised') return grouped.find((g) => g.folder === null)?.bookmarks ?? [];
		return grouped.find((g) => g.folder?.id === selectedId)?.bookmarks ?? [];
	});

	/** The full name of the currently selected folder/view */
	const selectedLabel = $derived.by(() => {
		if (selectedId === 'all') return 'All Bookmarks';
		if (selectedId === 'uncategorised') return 'Uncategorised';
		return folders.find((f) => f.id === selectedId)?.name ?? '';
	});

	onMount(async () => { await load(); });

	async function load() {
		loading = true; error = '';
		try {
			[grouped, folders] = await Promise.all([listAllBookmarks(), listFolders()]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load bookmarks.';
		} finally { loading = false; }
	}

	async function handleCreateFolder() {
		if (!newFolderName.trim()) return;
		creatingFolder = true;
		try {
			const f = await createFolder(newFolderName.trim());
			folders = [...folders, f];
			grouped = [...grouped, { folder: f, bookmarks: [] }];
			newFolderName = ''; showNewFolder = false;
			selectedId = f.id;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not create folder.'; }
		finally { creatingFolder = false; }
	}

	async function handleRenameFolder(folder: BookmarkFolder, newName: string) {
		try {
			await updateFolder(folder.id, newName);
			folders = folders.map((f) => f.id === folder.id ? { ...f, name: newName } : f);
			grouped = grouped.map((g) => g.folder?.id === folder.id ? { ...g, folder: { ...g.folder!, name: newName } } : g);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not rename folder.'; }
	}

	async function handleDeleteFolder(id: string) {
		try {
			await deleteFolder(id);
			folders = folders.filter((f) => f.id !== id);
			grouped = grouped.filter((g) => g.folder?.id !== id);
			if (selectedId === id) selectedId = 'all';
		} catch (e) { error = e instanceof Error ? e.message : 'Could not delete folder.'; }
	}

	async function handleReorderFolders(reordered: BookmarkFolder[]) {
		folders = reordered;
		try { await reorderFolders(reordered); } catch { /* silent */ }
	}

	async function handleRemoveBookmark(id: string) {
		try {
			await deleteBookmark(id);
			grouped = grouped.map((g) => ({ ...g, bookmarks: g.bookmarks.filter((b) => b.id !== id) }));
		} catch (e) { error = e instanceof Error ? e.message : 'Could not remove bookmark.'; }
	}

	async function handleMoveBookmark(bm: Bookmark, folderId: string | null) {
		try {
			await moveBookmark(bm.id, folderId);
			grouped = grouped.map((g) => ({ ...g, bookmarks: g.bookmarks.filter((b) => b.id !== bm.id) }));
			const updated = { ...bm, folder: folderId };
			grouped = grouped.map((g) => {
				if (folderId === null && g.folder === null) return { ...g, bookmarks: [...g.bookmarks, updated] };
				if (folderId && g.folder?.id === folderId) return { ...g, bookmarks: [...g.bookmarks, updated] };
				return g;
			});
		} catch (e) { error = e instanceof Error ? e.message : 'Could not move bookmark.'; }
	}

	async function handleReorderBookmarks(reordered: Bookmark[]) {
		grouped = grouped.map((g) => {
			const ids = new Set(reordered.map((b) => b.id));
			if (g.bookmarks.some((b) => ids.has(b.id))) return { ...g, bookmarks: reordered };
			return g;
		});
		try { await reorderBookmarks(reordered); } catch { /* silent */ }
	}

	function handleNavigate(bm: Bookmark) {
		switch (bm.contentType) {
			case 'textbook': goto(`/viewer/textbooks/${bm.contentId}`); break;
			case 'chapter': goto(`/viewer/textbooks/${bm.contentMeta.textbookId}/chapters/${bm.contentId}`); break;
			case 'flashcard_category': goto(`/viewer/flashcards/category/${bm.contentId}`); break;
			case 'flashcard': goto(`/viewer/flashcards/category/${bm.contentMeta.categoryId}`); break;
		}
	}
</script>

<svelte:head>
	<title>Bookmarks — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-4xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Bookmarks</h1>
		<p class="text-[var(--color-text-secondary)]">Your saved content, organised in folders.</p>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	{#if loading}
		<div class="flex gap-6">
			<div class="w-48 flex flex-col gap-2">
				{#each Array(4) as _}<div class="h-9 rounded-lg bg-[var(--color-surface-800)]"></div>{/each}
			</div>
			<div class="flex-1 flex flex-col gap-2">
				{#each Array(3) as _}<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>{/each}
			</div>
		</div>
	{:else}
		<div class="flex gap-6 items-start">
			<!-- Folders panel -->
			<div class="w-48 shrink-0 flex flex-col gap-2 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-900)] p-3">
				<FolderPanel
					{folders}
					selectedId={selectedId}
					onSelect={(id) => (selectedId = id)}
					onCreate={() => (showNewFolder = true)}
					onRename={handleRenameFolder}
					onDelete={handleDeleteFolder}
					onReorder={handleReorderFolders}
				/>
				{#if showNewFolder}
					<div class="flex flex-col gap-2 border-t border-[var(--color-surface-700)] pt-2">
						<input
							type="text"
							bind:value={newFolderName}
							placeholder="Folder name…"
							onkeydown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { showNewFolder = false; newFolderName = ''; } }}
							autofocus
							class="w-full rounded-lg border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-2 py-1.5 text-sm
							       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
						/>
						<div class="flex gap-1.5">
							<button onclick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
								class="flex-1 rounded-lg bg-[var(--color-accent-500)] py-1 text-xs font-medium
								       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">
								Create
							</button>
							<button onclick={() => { showNewFolder = false; newFolderName = ''; }}
								class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
								✕
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Bookmarks list with folder name header -->
			<div class="flex-1 min-w-0 flex flex-col gap-3">
				<!-- Full folder name header -->
				<div class="flex items-center gap-2">
					<h2 class="text-base font-semibold text-[var(--color-text-primary)]">{selectedLabel}</h2>
					{#if displayedBookmarks.length > 0}
						<span class="text-sm text-[var(--color-text-muted)]">
							({displayedBookmarks.length})
						</span>
					{/if}
				</div>
				<BookmarkList
					bookmarks={displayedBookmarks}
					{folders}
					onNavigate={handleNavigate}
					onMove={handleMoveBookmark}
					onRemove={handleRemoveBookmark}
					onReorder={handleReorderBookmarks}
				/>
			</div>
		</div>
	{/if}
</div>
