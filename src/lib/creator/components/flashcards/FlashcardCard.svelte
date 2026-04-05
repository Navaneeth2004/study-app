<script lang="ts">
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	interface Props {
		flashcard: Flashcard;
		onEdit: (flashcard: Flashcard) => void;
		onDelete: (id: string) => void;
		onDragStart: (e: DragEvent, id: string) => void;
		onDragOver: (e: DragEvent) => void;
		onDrop: (e: DragEvent, id: string) => void;
		onDragEnd: () => void;
		draggingId: string | null;
	}
	let { flashcard, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, draggingId }: Props = $props();
	let confirmingDelete = $state(false);
	const isDragging = $derived(draggingId === flashcard.id);
</script>

<div role="listitem" draggable="true"
	ondragstart={(e) => onDragStart(e, flashcard.id)}
	ondragover={(e) => { e.preventDefault(); onDragOver(e); }}
	ondrop={(e) => onDrop(e, flashcard.id)}
	ondragend={() => onDragEnd()}
	class="group relative flex flex-col gap-3 rounded-xl border bg-[var(--color-surface-900)]
	       p-4 transition-all cursor-grab active:cursor-grabbing
	       {isDragging
		? 'border-[var(--color-accent-500)] opacity-50'
		: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)] hover:bg-[var(--color-surface-800)]'}">

	<div class="flex items-center justify-between">
		<div class="flex h-7 w-7 items-center justify-center rounded-lg"
		     style="background: color-mix(in srgb, var(--color-accent-500) 12%, transparent);">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     style="color: var(--color-accent-400);">
				<rect x="2" y="4" width="14" height="10" rx="2"/>
				<rect x="8" y="10" width="14" height="10" rx="2"/>
			</svg>
		</div>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
		     stroke-linecap="round" class="text-[var(--color-surface-600)] group-hover:text-[var(--color-text-muted)] transition-colors">
			<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
		</svg>
	</div>

	{#if flashcard.frontImageUrl}
		<img src={flashcard.frontImageUrl} alt=""
		     class="w-full h-20 rounded-lg object-cover border border-[var(--color-surface-700)]" />
	{/if}

	<button onclick={() => onEdit(flashcard)}
		class="text-left text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2
		       hover:text-[var(--color-accent-400)] transition-colors leading-snug">
		{flashcard.frontText}
	</button>
	<p class="text-xs text-[var(--color-text-muted)] line-clamp-1">{flashcard.backText}</p>

	{#if !confirmingDelete}
		<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
			<button onclick={() => onEdit(flashcard)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				Edit
			</button>
			<span class="text-[var(--color-surface-600)]">·</span>
			<button onclick={() => (confirmingDelete = true)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
				Delete
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-2">
			<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
			<button onclick={() => { confirmingDelete = false; onDelete(flashcard.id); }}
				class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-0.5 text-xs font-medium
				       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">Yes</button>
			<button onclick={() => (confirmingDelete = false)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Cancel</button>
		</div>
	{/if}
</div>
