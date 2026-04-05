<script lang="ts">
	interface Props { data: Record<string, unknown>; }
	let { data }: Props = $props();
	type Variant = 'info' | 'warning' | 'tip';
	const variant = (data.variant as Variant) ?? 'info';
	const rawText = (data.text as string) ?? '';
	const icons: Record<Variant, string> = { info: 'ℹ', warning: '⚠', tip: '✓' };

	// Render bold/italic/underline tags + preserve newlines as <br>
	const rendered = $derived(
		rawText
			.replace(/<b>([\s\S]*?)<\/b>/g, '<strong>$1</strong>')
			.replace(/<i>([\s\S]*?)<\/i>/g, '<em>$1</em>')
			.replace(/<l>([\s\S]*?)<\/l>/g, '<u>$1</u>')
			.replace(/\n/g, '<br>')
	);
</script>

<div class="flex gap-3 rounded-xl px-4 py-3"
     style="border-left: 4px solid var(--callout-{variant}); background: color-mix(in srgb, var(--callout-{variant}) 12%, transparent);">
	<span class="shrink-0 text-sm font-bold mt-0.5" style="color: var(--callout-{variant});">{icons[variant]}</span>
	<div class="text-sm text-[var(--color-text-primary)] leading-relaxed">{@html rendered}</div>
</div>
