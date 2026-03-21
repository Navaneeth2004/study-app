<script lang="ts">
	interface Props {
		heading: string;
		description?: string;
		actionLabel?: string;
		onAction?: () => void;
	}

	let { heading, description = '', actionLabel, onAction }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed
            border-[var(--color-surface-600)] bg-[var(--color-surface-900)]/50 px-6 py-14 text-center"
     style="width: 100%; max-width: 600px;">
	<div class="flex flex-col gap-1.5 items-center">
		<p class="text-sm font-medium text-[var(--color-text-secondary)]">{heading}</p>
		{#if description}
			<p class="text-sm text-[var(--color-text-muted)]">{description}</p>
		{/if}
	</div>
	{#if actionLabel && onAction}
		<button
			onclick={onAction}
			class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
			       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] transition-colors"
		>
			{actionLabel}
		</button>
	{/if}
</div>
