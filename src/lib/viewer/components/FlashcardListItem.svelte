<script lang="ts">
	import type { Flashcard } from '$lib/creator/flashcardTypes';

	interface Props {
		flashcard: Flashcard;
		selected?: boolean;
		showCheckbox?: boolean;
		onToggle?: (id: string) => void;
		onClick?: (flashcard: Flashcard) => void;
	}

	let { flashcard, selected = false, showCheckbox = false, onToggle, onClick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={() => !showCheckbox && onClick?.(flashcard)}
	class="group flex items-center gap-3 rounded-xl border px-5 py-3 transition-colors cursor-pointer
	       {showCheckbox && selected
		? 'border-[var(--color-accent-500)]/50 bg-[var(--color-accent-500)]/5'
		: 'border-[var(--color-surface-700)] bg-[var(--color-surface-900)]'}"
	style="min-height: var(--card-row-min-height);"
>
	{#if showCheckbox}
		<input
			type="checkbox"
			checked={selected}
			onchange={() => onToggle?.(flashcard.id)}
			class="h-4 w-4 shrink-0 accent-[var(--color-accent-500)] cursor-pointer"
		/>
	{/if}

	{#if flashcard.frontImageUrl}
		<img
			src={flashcard.frontImageUrl}
			alt=""
			class="h-9 w-9 shrink-0 rounded-lg object-cover border border-[var(--color-surface-700)]"
		/>
	{/if}

	<span class="flex-1 truncate text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-400)] transition-colors">
		{flashcard.frontText}
	</span>
</div>
