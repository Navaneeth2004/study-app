<script lang="ts">
	/**
	 * Reusable B / I / L (bold / italic / underline) toolbar.
	 * Call wrapSelection(tag, textarea) to wrap the current selection.
	 */
	interface Props {
		textarea: HTMLTextAreaElement | HTMLInputElement | null;
		onWrap: (tag: string) => void;
	}
	let { onWrap }: Props = $props();
</script>

<div class="flex items-center gap-0.5">
	{#each [['b', 'B', 'Bold'], ['i', 'I', 'Italic'], ['l', 'L', 'Underline']] as [tag, label, title]}
		<button
			type="button"
			onclick={() => onWrap(tag)}
			title={title}
			class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold
			       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)]
			       hover:text-[var(--color-text-primary)] transition-colors"
		>
			{#if tag === 'b'}<strong>{label}</strong>
			{:else if tag === 'i'}<em>{label}</em>
			{:else}<span style="text-decoration:underline">{label}</span>
			{/if}
		</button>
	{/each}
</div>
