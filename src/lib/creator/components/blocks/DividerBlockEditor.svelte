<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		onUpdate: (data: Record<string, unknown>) => void;
	}

	// Divider has no data — no onMount emit needed (would incorrectly set isDirty)
	let {}: Props = $props();
</script>

<div class="flex flex-col items-center gap-2 py-2">
	<hr class="w-full border-t border-[var(--color-surface-600)]" />
	<span class="text-xs text-[var(--color-text-muted)]">Divider — no content needed</span>
</div>
