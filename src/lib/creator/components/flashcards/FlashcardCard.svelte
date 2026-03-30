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
	const hasMedia = $derived(!!flashcard.frontImageUrl || !!flashcard.backImageUrl || !!flashcard.frontAudioUrl || !!flashcard.backAudioUrl);
</script>

<!--
  Same row layout as ChapterRow for visual consistency.
  Front text is a clickable button to open the edit modal.
-->
<div
	role="listitem"
	ondragover={(e) => { e.preventDefault(); onDragOver(e); }}
	ondrop={(e) => onDrop(e, flashcard.id)}
	class="group flex items-center gap-3 rounded-xl border bg-[var(--color-surface-900)] px-4 py-3 transition-all
	       {isDragging
		? 'border-[var(--color-accent-500)] opacity-50'
		: 'border-[var(--color-surface-700)] hover:border-[var(--color-surface-600)] hover:bg-[var(--color-surface-800)]'}"
>
	<!-- Flashcard icon badge -->
	<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
	     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
		<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
		     stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-400);">
			<rect x="2" y="4" width="14" height="10" rx="2"/>
			<rect x="8" y="10" width="14" height="10" rx="2"/>
		</svg>
	</div>

	<!-- Front text — clicking opens edit modal -->
	<button
		onclick={() => onEdit(flashcard)}
		class="flex-1 min-w-0 text-left"
	>
		<p class="truncate text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-400)] transition-colors">
			{flashcard.frontText}
		</p>
		{#if flashcard.backText}
			<p class="truncate text-xs text-[var(--color-text-muted)] mt-0.5">
				↩ {flashcard.backText}
			</p>
		{/if}
	</button>

	<!-- Media indicator -->
	{#if hasMedia}
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
		     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
		     class="shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
			<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
		</svg>
	{/if}

	<!-- Actions -->
	{#if !confirmingDelete}
		<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
			<button onclick={() => onEdit(flashcard)}
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Edit flashcard">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
					<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
				</svg>
			</button>
			<button onclick={() => (confirmingDelete = true)}
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-700)] hover:text-[var(--color-error-400)] transition-colors"
				aria-label="Delete flashcard">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
				</svg>
			</button>
		</div>
	{:else}
		<div class="flex items-center gap-2 shrink-0">
			<span class="text-xs text-[var(--color-text-secondary)]">Delete?</span>
			<button onclick={() => { confirmingDelete = false; onDelete(flashcard.id); }}
				class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
				Yes
			</button>
			<button onclick={() => (confirmingDelete = false)}
				class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				No
			</button>
		</div>
	{/if}

	<!-- Drag handle -->
	<div
		draggable="true"
		ondragstart={(e) => onDragStart(e, flashcard.id)}
		class="shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-surface-600)] group-hover:text-[var(--color-text-muted)] transition-colors"
		aria-label="Drag to reorder"
	>
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
			<line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
		</svg>
	</div>
</div>
