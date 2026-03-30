<script lang="ts">
	import type { Chapter } from '$lib/creator/creatorTypes';

	interface Props {
		chapter: Chapter;
		textbookId: string;
		blockCount?: number;
		flashcardCount?: number;
		onDelete: (id: string) => void;
		onDragStart: (e: DragEvent, chapter: Chapter) => void;
		onDragOver: (e: DragEvent, chapter: Chapter) => void;
		onDrop: (e: DragEvent, chapter: Chapter) => void;
		draggingId: string | null;
	}

	let { chapter, textbookId, blockCount, flashcardCount, onDelete, onDragStart, onDragOver, onDrop, draggingId }: Props = $props();
	let confirmingDelete = $state(false);
	const isDragging = $derived(draggingId === chapter.id);
</script>

<!--
  Row-style card: order badge | title (link) | meta chips | actions | drag handle
  No fixed height, no inner gaps that push content too far apart.
-->
<div
	role="listitem"
	ondragover={(e) => { e.preventDefault(); onDragOver(e, chapter); }}
	ondrop={(e) => onDrop(e, chapter)}
	class="group flex items-center gap-3 rounded-xl border bg-[var(--color-surface-900)] px-4 py-3 transition-all
	       {isDragging
		? 'border-[var(--color-accent-500)] opacity-50'
		: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)] hover:bg-[var(--color-surface-800)]'}"
>
	<!-- Order badge -->
	<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-[var(--color-accent-400)]"
	      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
		{chapter.order}
	</span>

	<!-- Title — takes all remaining space -->
	<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
	   class="flex-1 min-w-0 truncate text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-400)] transition-colors">
		{chapter.title}
	</a>

	<!-- Meta chips — hidden until hover so they don't clutter the default state -->
	<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
		{#if blockCount !== undefined}
			<span class="text-xs text-[var(--color-text-muted)]">{blockCount}b</span>
		{/if}
		{#if flashcardCount !== undefined && flashcardCount > 0}
			<span class="text-xs text-[var(--color-text-muted)]">{flashcardCount}c</span>
		{/if}
	</div>

	<!-- Actions -->
	{#if !confirmingDelete}
		<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
			<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
			   class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
			          hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
			   aria-label="Edit chapter">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</a>
			<button onclick={() => (confirmingDelete = true)}
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-error-400)] transition-colors"
				aria-label="Delete chapter">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
				</svg>
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-2 shrink-0">
			<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
			<button onclick={() => { confirmingDelete = false; onDelete(chapter.id); }}
				class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
				Yes
			</button>
			<button onclick={() => (confirmingDelete = false)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				No
			</button>
		</div>
	{/if}

	<!-- Drag handle — far right -->
	<div
		draggable="true"
		ondragstart={(e) => onDragStart(e, chapter)}
		class="shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-surface-600)] group-hover:text-[var(--color-text-muted)] transition-colors"
		aria-label="Drag to reorder"
	>
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
			<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
		</svg>
	</div>
</div>
