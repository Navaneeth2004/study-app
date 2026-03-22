<script lang="ts">
	import { NOTIFICATION_ICONS } from '$lib/notifications/notificationIcons';

	interface Props {
		selectedKey: string;
		onSelect: (key: string) => void;
	}

	let { selectedKey, onSelect }: Props = $props();
</script>

<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
	{#each NOTIFICATION_ICONS as icon (icon.key)}
		<button
			onclick={() => onSelect(icon.key)}
			aria-label="{icon.label} icon"
			class="flex flex-col items-center gap-1 rounded-xl border p-2 transition-colors
			       {selectedKey === icon.key
				? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10'
				: 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)] hover:bg-[var(--color-surface-800)]'}"
		>
			<span class="text-xl leading-none">{icon.emoji}</span>
			<span class="text-xs text-[var(--color-text-muted)] leading-none">{icon.label}</span>
		</button>
	{/each}
</div>
