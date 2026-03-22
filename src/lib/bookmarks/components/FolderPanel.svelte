<script lang="ts">
	import type { BookmarkFolder } from '$lib/bookmarks/bookmarkTypes';

	interface Props {
		folders: BookmarkFolder[];
		selectedId: string | 'all' | 'uncategorised';
		onSelect: (id: string | 'all' | 'uncategorised') => void;
		onCreate: () => void;
		onRename: (folder: BookmarkFolder, newName: string) => void;
		onDelete: (id: string) => void;
		onReorder: (folders: BookmarkFolder[]) => void;
	}

	let { folders, selectedId, onSelect, onCreate, onRename, onDelete, onReorder }: Props = $props();

	let editingId = $state<string | null>(null);
	let editName = $state('');
	let confirmDeleteId = $state<string | null>(null);
	let draggingId = $state<string | null>(null);

	function startEdit(folder: BookmarkFolder, e: MouseEvent) {
		e.stopPropagation();
		editingId = folder.id;
		editName = folder.name;
	}

	function commitEdit(folder: BookmarkFolder) {
		if (editName.trim() && editName.trim() !== folder.name) {
			onRename(folder, editName.trim());
		}
		editingId = null;
	}

	function handleDragStart(e: DragEvent, id: string) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (!draggingId || draggingId === targetId) { draggingId = null; return; }
		const from = folders.findIndex((f) => f.id === draggingId);
		const to = folders.findIndex((f) => f.id === targetId);
		const reordered = [...folders];
		const [moved] = reordered.splice(from, 1);
		reordered.splice(to, 0, moved);
		draggingId = null;
		onReorder(reordered);
	}
</script>

<div class="flex flex-col gap-0.5">
	<!-- All bookmarks -->
	<button
		onclick={() => onSelect('all')}
		class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors
		       {selectedId === 'all'
			? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
			: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]'}"
	>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
		</svg>
		All Bookmarks
	</button>

	<!-- Folders -->
	{#each folders as folder (folder.id)}
		<div
			role="listitem"
			draggable="true"
			ondragstart={(e) => handleDragStart(e, folder.id)}
			ondragover={(e) => e.preventDefault()}
			ondrop={(e) => handleDrop(e, folder.id)}
			class="group rounded-lg transition-colors
			       {draggingId === folder.id ? 'opacity-50' : ''}"
		>
			<!-- Main row -->
			<div class="flex items-center gap-1 rounded-lg
			            {selectedId === folder.id ? 'bg-[var(--color-accent-500)]/15' : 'hover:bg-[var(--color-surface-800)]'}">
				{#if editingId === folder.id}
					<input
						type="text"
						bind:value={editName}
						onblur={() => commitEdit(folder)}
						onkeydown={(e) => { if (e.key === 'Enter') commitEdit(folder); if (e.key === 'Escape') editingId = null; }}
						class="flex-1 rounded-lg bg-transparent px-3 py-2 text-sm
						       text-[var(--color-text-primary)] focus:outline-none"
						autofocus
					/>
				{:else}
					<button
						onclick={() => onSelect(folder.id)}
						class="flex flex-1 items-center gap-2.5 overflow-hidden px-3 py-2 text-left text-sm
						       {selectedId === folder.id ? 'text-[var(--color-accent-400)]' : 'text-[var(--color-text-secondary)]'}"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
							<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
						</svg>
						<span class="truncate">{folder.name}</span>
					</button>
				{/if}

				<!-- Edit + delete buttons — shown on hover, always inside the row -->
				{#if editingId !== folder.id && confirmDeleteId !== folder.id}
					<div class="flex shrink-0 items-center gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={(e) => startEdit(folder, e)}
							aria-label="Rename folder"
							class="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-secondary)] transition-colors"
						>
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
								<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
							</svg>
						</button>
						<button
							onclick={(e) => { e.stopPropagation(); confirmDeleteId = folder.id; }}
							aria-label="Delete folder"
							class="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-error-400)] transition-colors"
						>
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"/>
								<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
							</svg>
						</button>
					</div>
				{/if}
			</div>

			<!-- Delete confirm — shown below the row, inside the folder's block -->
			{#if confirmDeleteId === folder.id}
				<div class="mx-2 mb-1 flex items-center gap-2 rounded-lg bg-[var(--color-surface-800)] px-2.5 py-1.5">
					<span class="flex-1 text-xs text-[var(--color-text-secondary)]">Delete folder?</span>
					<button
						onclick={() => { confirmDeleteId = null; onDelete(folder.id); }}
						class="rounded px-2 py-0.5 text-xs text-[var(--color-error-400)]
						       hover:bg-[var(--color-error-500)]/15 transition-colors"
					>Yes</button>
					<button
						onclick={() => (confirmDeleteId = null)}
						class="rounded px-2 py-0.5 text-xs text-[var(--color-text-muted)]
						       hover:text-[var(--color-text-secondary)] transition-colors"
					>No</button>
				</div>
			{/if}
		</div>
	{/each}

	<!-- Uncategorised -->
	<button
		onclick={() => onSelect('uncategorised')}
		class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors
		       {selectedId === 'uncategorised'
			? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
			: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-secondary)]'}"
	>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
		</svg>
		Uncategorised
	</button>

	<!-- New folder -->
	<button
		onclick={onCreate}
		class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm
		       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
		       hover:text-[var(--color-text-secondary)] transition-colors mt-1"
	>
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
		</svg>
		New Folder
	</button>
</div>
