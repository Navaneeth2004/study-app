<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		onUpdate: (data: Record<string, unknown>) => void;
	}

	let { data, onUpdate }: Props = $props();

	type Variant = 'info' | 'warning' | 'tip';

	let variant = $state<Variant>((data.variant as Variant) ?? 'info');
	let text = $state((data.text as string) ?? '');

	const variantList: Variant[] = ['info', 'warning', 'tip'];
	const labels: Record<Variant, string> = { info: 'Info', warning: 'Warning', tip: 'Tip' };

	function emit() {
		onUpdate({ variant, text });
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Variant selector -->
	<div class="flex gap-2">
		{#each variantList as v}
			<button
				onclick={() => { variant = v; emit(); }}
				class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
				style={variant === v
					? `border-color: var(--callout-${v}); background: color-mix(in srgb, var(--callout-${v}) 12%, transparent); color: var(--callout-${v});`
					: `border-color: var(--color-surface-600); color: var(--color-text-muted); background: transparent;`}
			>
				{labels[v]}
			</button>
		{/each}
	</div>

	<!-- Preview strip -->
	<div
		class="rounded-lg px-3 py-2 text-xs"
		style="border-left: 3px solid var(--callout-{variant}); background: color-mix(in srgb, var(--callout-{variant}) 8%, transparent); color: var(--callout-{variant});"
	>
		{labels[variant]} block
	</div>

	<!-- Text -->
	<textarea
		bind:value={text}
		oninput={emit}
		rows={3}
		placeholder="Callout text…"
		class="w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)]
		       placeholder:text-[var(--color-text-muted)] focus:outline-none"
	></textarea>
</div>
