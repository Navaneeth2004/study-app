<script lang="ts">
	import type { Textbook } from '$lib/creator/creatorTypes';

	interface Props {
		textbook: Textbook;
		onDelete: (id: string) => void;
	}

	let { textbook, onDelete }: Props = $props();

	let confirmingDelete = $state(false);
</script>

<div class="app-card group">
	<div class="flex items-start justify-between gap-3 flex-1">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<a
				href="/creator/textbooks/{textbook.id}"
				class="text-base font-medium leading-snug truncate transition-colors
				       text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-400)]"
			>
				{textbook.title}
			</a>
			{#if textbook.description}
				<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">
					{textbook.description}
				</p>
			{/if}
		</div>

		<div class="shrink-0 flex items-center gap-1">
			<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<a
					href="/creator/textbooks/{textbook.id}"
					class="flex h-7 w-7 items-center justify-center rounded-lg
					       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
					       hover:text-[var(--color-text-primary)] transition-colors"
					aria-label="Edit textbook"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
						<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
					</svg>
				</a>
				{#if !confirmingDelete}
					<button
						onclick={() => (confirmingDelete = true)}
						class="flex h-7 w-7 items-center justify-center rounded-lg
						       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
						       hover:text-[var(--color-error-400)] transition-colors"
						aria-label="Delete textbook"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
						</svg>
					</button>
				{/if}
			</div>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg"
			     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
				     style="color: var(--color-accent-400);">
					<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
				</svg>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<span class="text-xs text-[var(--color-text-muted)]">
			{textbook.chaptersCount ?? 0} {textbook.chaptersCount === 1 ? 'chapter' : 'chapters'}
		</span>
		{#if confirmingDelete}
			<div class="flex items-center gap-2 mt-1">
				<span class="text-xs text-[var(--color-text-secondary)]">Delete this textbook?</span>
				<button
					onclick={() => onDelete(textbook.id)}
					class="rounded-lg bg-[var(--color-error-500)]/15 px-2.5 py-1 text-xs
					       font-medium text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors"
				>Yes</button>
				<button
					onclick={() => (confirmingDelete = false)}
					class="rounded-lg border border-[var(--color-surface-600)] px-2.5 py-1 text-xs
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
				>Cancel</button>
			</div>
		{/if}
	</div>
</div>
