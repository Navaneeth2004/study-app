<script lang="ts">
	interface Props {
		selectedColor: string;
		onSelect: (color: string) => void;
		colors: string[];
	}

	let { selectedColor, onSelect, colors }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each colors as color}
		<button
			onclick={() => onSelect(color)}
			aria-label="Select colour {color}"
			class="h-8 w-8 rounded-full transition-all
			       {selectedColor === color
				? 'ring-2 ring-offset-2 ring-offset-[var(--color-surface-900)] ring-[var(--color-text-primary)] scale-110'
				: 'hover:scale-105'}"
			style="background: {color};"
		></button>
	{/each}
</div>
