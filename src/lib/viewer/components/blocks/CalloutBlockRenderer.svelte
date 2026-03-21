<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
	}

	let { data }: Props = $props();

	type Variant = 'info' | 'warning' | 'tip';
	const variant = (data.variant as Variant) ?? 'info';
	const text = (data.text as string) ?? '';

	const icons: Record<Variant, string> = { info: 'ℹ', warning: '⚠', tip: '✓' };
</script>

<div
	class="flex gap-3 rounded-xl px-4 py-3"
	style="border-left: 4px solid var(--callout-{variant}); background: color-mix(in srgb, var(--callout-{variant}) 12%, transparent);"
>
	<span
		class="shrink-0 text-sm font-bold"
		style="color: var(--callout-{variant});"
	>{icons[variant]}</span>
	<p class="text-sm text-[var(--color-text-primary)] leading-relaxed">{text}</p>
</div>
