<script lang="ts">
	import type { Flashcard } from '$lib/creator/flashcardTypes';

	interface Props {
		flashcard: Flashcard;
		onEdit: (flashcard: Flashcard) => void;
		onDelete: (id: string) => void;
		onDragStart: (e: DragEvent, id: string) => void;
		onDragOver: (e: DragEvent) => void;
		onDrop: (e: DragEvent, id: string) => void;
		draggingId: string | null;
	}

	let { flashcard, onEdit, onDelete, onDragStart, onDragOver, onDrop, draggingId }: Props = $props();
	let confirmingDelete = $state(false);
	const isDragging = $derived(draggingId === flashcard.id);
</script>

<div
	role="listitem"
	draggable="true"
	ondragstart={(e) => onDragStart(e, flashcard.id)}
	ondragover={(e) => { e.preventDefault(); onDragOver(e); }}
	ondrop={(e) => onDrop(e, flashcard.id)}
	class="group app-card relative cursor-pointer
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

	<!-- Front image thumbnail -->
	{#if flashcard.frontImageUrl}
		<img src={flashcard.frontImageUrl} alt=""
		     class="mb-2 h-16 w-full rounded-lg object-cover border border-[var(--color-surface-700)]" />
	{/if}

	<!-- Front text -->
	<button onclick={() => onEdit(flashcard)}
		class="w-full text-left text-sm font-medium text-[var(--color-text-primary)]
		       line-clamp-2 hover:text-[var(--color-accent-400)] transition-colors leading-snug">
		{flashcard.frontText}
	</button>

	<!-- Actions -->
	{#if !confirmingDelete}
		<div class="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
			<button onclick={() => onEdit(flashcard)}
				class="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Edit">
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</button>
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
			<button onclick={() => { confirmingDelete = false; onDelete(flashcard.id); }}
				class="rounded-md bg-[var(--color-error-500)]/15 px-2 py-0.5 text-xs font-medium
				       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Delete</button>
			<button onclick={() => (confirmingDelete = false)}
				class="rounded-md border border-[var(--color-surface-600)] px-2 py-0.5 text-xs
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Cancel</button>
		</div>
	{/if}
</div>
