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
	let textarea: HTMLTextAreaElement;

	function emit() { onUpdate({ variant, text }); }

	function wrapSelection(tag: string) {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		text = textarea.value.slice(0, start) + wrapped + textarea.value.slice(end);
		onUpdate({ variant, text });
		setTimeout(() => {
			textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
			textarea.focus();
		}, 0);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex gap-2">
		{#each variantList as v}
			<button onclick={() => { variant = v; emit(); }}
				class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
				style={variant === v
					? `border-color:var(--callout-${v});background:color-mix(in srgb,var(--callout-${v}) 12%,transparent);color:var(--callout-${v});`
					: `border-color:var(--color-surface-600);color:var(--color-text-muted);background:transparent;`}>
				{labels[v]}
			</button>
		{/each}
	</div>

	<!-- Formatting toolbar -->
	<div class="flex items-center gap-1">
		{#each [['b','B'],['i','I'],['l','U']] as [tag, label]}
			<button type="button" onclick={() => wrapSelection(tag)}
				class="flex h-7 w-7 items-center justify-center rounded text-xs font-bold
				       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Wrap in {tag}">
				{label}
			</button>
		{/each}
	</div>

	<textarea
		bind:this={textarea}
		bind:value={text}
		oninput={emit}
		rows={4}
		placeholder="Callout text… (use B/I/U buttons for formatting, Enter for new lines)"
		class="w-full resize-y bg-transparent text-sm text-[var(--color-text-primary)]
		       placeholder:text-[var(--color-text-muted)] focus:outline-none"
	></textarea>
</div>
