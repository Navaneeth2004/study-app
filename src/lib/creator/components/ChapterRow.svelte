<script lang="ts">
	import type { Chapter } from '$lib/creator/creatorTypes';
	interface Props {
		chapter: Chapter; textbookId: string;
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

<div role="listitem" draggable="true"
	ondragstart={(e) => onDragStart(e, chapter)}
	ondragover={(e) => onDragOver(e, chapter)}
	ondrop={(e) => onDrop(e, chapter)}
	class="group relative flex flex-col gap-3 rounded-xl border bg-[var(--color-surface-900)]
	       p-4 transition-all cursor-grab active:cursor-grabbing
	       {isDragging
		? 'border-[var(--color-accent-500)] opacity-50'
		: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)] hover:bg-[var(--color-surface-800)]'}">

	<!-- Top row: number + drag indicator -->
	<div class="flex items-center justify-between">
		<span class="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold
		             text-[var(--color-accent-400)]"
		      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
			{chapter.order}
		</span>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
		     stroke-linecap="round" class="text-[var(--color-surface-600)] group-hover:text-[var(--color-text-muted)] transition-colors">
			<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
		</svg>
	</div>

	<!-- Title -->
	<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
	   class="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2
	          hover:text-[var(--color-accent-400)] transition-colors leading-snug">
		{chapter.title}
	</a>

	<!-- Actions row -->
	{#if !confirmingDelete}
		<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
			<a href="/creator/textbooks/{textbookId}/chapters/{chapter.id}"
			   class="flex items-center gap-1 text-xs text-[var(--color-text-muted)]
			          hover:text-[var(--color-text-secondary)] transition-colors">
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
				Edit
			</a>
			<span class="text-[var(--color-surface-600)]">·</span>
			<button onclick={() => (confirmingDelete = true)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
				Delete
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-2">
			<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
			<button onclick={() => onDelete(chapter.id)}
				class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-0.5 text-xs font-medium
				       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Yes</button>
			<button onclick={() => (confirmingDelete = false)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Cancel</button>
		</div>
	{/if}
</div>
