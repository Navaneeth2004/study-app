<script lang="ts">
	import type { Bookmark, BookmarkFolder } from '$lib/bookmarks/bookmarkTypes';

	interface Props {
		bookmarks: Bookmark[];
		folders: BookmarkFolder[];
		onNavigate: (bookmark: Bookmark) => void;
		onMove: (bookmark: Bookmark, folderId: string | null) => void;
		onRemove: (id: string) => void;
		onReorder: (bookmarks: Bookmark[]) => void;
	}

	let { bookmarks, folders, onNavigate, onMove, onRemove, onReorder }: Props = $props();

	let confirmRemoveId = $state<string | null>(null);
	let movingId = $state<string | null>(null);
	let draggingId = $state<string | null>(null);

	function handleDragStart(e: DragEvent, id: string) {
		draggingId = id;
		e.dataTransfer?.setData('text/plain', id);
	}

	function handleDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		if (!draggingId || draggingId === targetId) { draggingId = null; return; }
		const from = bookmarks.findIndex((b) => b.id === draggingId);
		const to = bookmarks.findIndex((b) => b.id === targetId);
		const reordered = [...bookmarks];
		const [moved] = reordered.splice(from, 1);
		reordered.splice(to, 0, moved);
		draggingId = null;
		onReorder(reordered);
	}
</script>

{#if bookmarks.length === 0}
	<div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed
	            border-[var(--color-surface-600)] py-12 text-center">
		<p class="text-sm text-[var(--color-text-muted)]">No bookmarks here yet.</p>
	</div>
{:else}
	<div role="list" class="flex flex-col gap-2">
		{#each bookmarks as bm (bm.id)}
			<div
				role="listitem"
				draggable="true"
				ondragstart={(e) => handleDragStart(e, bm.id)}
				ondragover={(e) => e.preventDefault()}
				ondrop={(e) => handleDrop(e, bm.id)}
				class="group flex flex-col gap-2 rounded-xl border bg-[var(--color-surface-900)] px-4 py-3 transition-colors
				       {draggingId === bm.id
					? 'border-[var(--color-accent-500)] opacity-50'
					: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)]'}"
			>
				<div class="flex items-center gap-3">
					<!-- Drag handle -->
					<div class="shrink-0 cursor-grab text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing" aria-hidden="true">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
							<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
						</svg>
					</div>

					<!-- Type icon -->
					<div class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg"
					     style="background: color-mix(in srgb, var(--color-accent-500) 12%, transparent);">
						{#if bm.contentType === 'textbook'}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
								<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
								<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
							</svg>
						{:else if bm.contentType === 'chapter'}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
								<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
							</svg>
						{:else if bm.contentType === 'flashcard_category'}
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
								<rect x="2" y="4" width="14" height="10" rx="2"/>
								<rect x="8" y="10" width="14" height="10" rx="2"/>
							</svg>
						{:else}
							<!-- flashcard -->
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
								<rect x="2" y="5" width="20" height="14" rx="2"/>
								<line x1="2" y1="10" x2="22" y2="10"/>
							</svg>
						{/if}
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-[var(--color-text-primary)] truncate">{bm.contentTitle}</p>
						{#if bm.contentSubtitle}
							<p class="text-xs text-[var(--color-text-muted)] truncate">{bm.contentSubtitle}</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onNavigate(bm)}
							class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
							       hover:border-[var(--color-surface-500)] transition-colors"
						>
							Go to
						</button>
						<button
							onclick={() => movingId = movingId === bm.id ? null : bm.id}
							class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
							aria-label="Move bookmark"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
							</svg>
						</button>
						{#if confirmRemoveId !== bm.id}
							<button
								onclick={() => (confirmRemoveId = bm.id)}
								class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
								       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors"
								aria-label="Remove bookmark"
							>
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"/>
									<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Move folder picker -->
				{#if movingId === bm.id}
					<div class="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--color-surface-700)]">
						<span class="text-xs text-[var(--color-text-muted)] w-full mb-0.5">Move to:</span>
						<button onclick={() => { movingId = null; onMove(bm, null); }}
							class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							No folder
						</button>
						{#each folders as folder}
							<button onclick={() => { movingId = null; onMove(bm, folder.id); }}
								class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
								{folder.name}
							</button>
						{/each}
						<button onclick={() => (movingId = null)}
							class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
							       text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
							Cancel
						</button>
					</div>
				{/if}

				<!-- Remove confirm -->
				{#if confirmRemoveId === bm.id}
					<div class="flex items-center gap-2 border-t border-[var(--color-surface-700)] pt-2">
						<span class="flex-1 text-xs text-[var(--color-text-secondary)]">Remove this bookmark?</span>
						<button onclick={() => { confirmRemoveId = null; onRemove(bm.id); }}
							class="rounded-lg bg-[var(--color-error-500)]/15 px-2.5 py-1 text-xs
							       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
							Remove
						</button>
						<button onclick={() => (confirmRemoveId = null)}
							class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							Cancel
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
