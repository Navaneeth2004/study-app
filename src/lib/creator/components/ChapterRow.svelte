<script lang="ts">
	import type { Chapter } from '$lib/creator/creatorTypes';

	interface Props {
		chapter: Chapter;
		textbookId: string;
		onDelete: (id: string) => void;
		onDragStart: (e: DragEvent, chapter: Chapter) => void;
		onDragOver: (e: DragEvent, chapter: Chapter) => void;
		onDrop: (e: DragEvent, chapter: Chapter) => void;
		draggingId: string | null;
	}

	let { chapter, textbookId, onDelete, onDragStart, onDragOver, onDrop, draggingId }: Props = $props();
	let confirmingDelete = $state(false);
	const isDragging = $derived(draggingId === chapter.id);
</script>

<div
	role="listitem"
	draggable="true"
	ondragstart={(e) => onDragStart(e, chapter)}
	ondragover={(e) => onDragOver(e, chapter)}
	ondrop={(e) => onDrop(e, chapter)}
	class="group app-card relative
	       {isDragging ? 'border-[var(--color-accent-500)] opacity-50' : ''}"
>
	<!-- Drag handle -->
	<div class="absolute top-2.5 right-2.5 cursor-grab text-[var(--color-text-muted)]
	            opacity-0 group-hover:opacity-100 transition-opacity active:cursor-grabbing"
	     aria-hidden="true">
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
			<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
		</svg>
	</div>

	<!-- Order badge -->
	<span class="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-md
	             bg-[var(--color-surface-700)] text-xs font-mono text-[var(--color-text-muted)]">
		{chapter.order}
	</span>

	<!-- Title -->
	<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
	   class="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2
	          hover:text-[var(--color-accent-400)] transition-colors leading-snug block">
		{chapter.title}
	</a>

	<!-- Actions -->
	{#if !confirmingDelete}
		<div class="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
			<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
			   class="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)]
			          hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
			   aria-label="Edit">
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</a>
			<button onclick={() => (confirmingDelete = true)}
			   class="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)]
			          hover:bg-[var(--color-surface-700)] hover:text-[var(--color-error-400)] transition-colors"
			   aria-label="Delete">
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
				</svg>
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-1.5 mt-3">
			<button onclick={() => onDelete(chapter.id)}
				class="rounded-md bg-[var(--color-error-500)]/15 px-2 py-0.5 text-xs font-medium
				       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Delete</button>
			<button onclick={() => (confirmingDelete = false)}
				class="rounded-md border border-[var(--color-surface-600)] px-2 py-0.5 text-xs
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Cancel</button>
		</div>
	{/if}
</div>
