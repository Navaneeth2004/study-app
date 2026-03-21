<script lang="ts">
	import type { FlashcardCategory } from '$lib/creator/flashcardTypes';

	interface Props {
		category: FlashcardCategory;
		onEdit: (category: FlashcardCategory) => void;
		onDelete: (id: string) => void;
	}

	let { category, onEdit, onDelete }: Props = $props();

	let confirmingDelete = $state(false);
</script>

<div class="app-card group">
	<!-- Top row: title + icon -->
	<div class="flex items-start justify-between gap-3 flex-1">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<a
				href="/creator/flashcards/{category.id}"
				class="app-card-title leading-snug hover:text-[var(--color-accent-400)] truncate transition-colors"
			>
				{category.name}
			</a>
			{#if category.description}
				<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">
					{category.description}
				</p>
			{/if}
		</div>

		<!-- Action buttons + deck icon -->
		<div class="shrink-0 flex items-center gap-1">
			<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					onclick={() => onEdit(category)}
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
					aria-label="Edit category"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
				</button>
				{#if !confirmingDelete}
					<button
						onclick={() => (confirmingDelete = true)}
						class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
						       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors"
						aria-label="Delete category"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
							<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
						</svg>
					</button>
				{/if}
			</div>
			<!-- Deck icon (always visible) -->
			<div class="flex h-8 w-8 items-center justify-center rounded-lg"
			     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
				     style="color: var(--color-accent-400);">
					<rect x="2" y="4" width="14" height="10" rx="2"/>
					<rect x="8" y="10" width="14" height="10" rx="2"/>
				</svg>
			</div>
		</div>
	</div>

	<!-- Bottom: count + delete confirm -->
	<div class="flex flex-col gap-2">
		{#if category.cardCount !== undefined}
			<span class="text-xs text-[var(--color-text-muted)]">
				{category.cardCount} {category.cardCount === 1 ? 'card' : 'cards'}
			</span>
		{/if}
		{#if confirmingDelete}
			<div class="flex items-center gap-2 mt-1">
				<span class="text-xs text-[var(--color-text-secondary)]">Delete this category?</span>
				<button
					onclick={() => { confirmingDelete = false; onDelete(category.id); }}
					class="rounded-lg bg-[var(--color-error-500)]/15 px-2 py-1 text-xs font-medium
					       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors"
				>Yes</button>
				<button
					onclick={() => (confirmingDelete = false)}
					class="rounded-lg border border-[var(--color-surface-600)] px-2 py-1 text-xs
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>Cancel</button>
			</div>
		{/if}
	</div>
</div>
