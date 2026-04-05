<script lang="ts">
	import type { BulletListBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: BulletListBlock['data'];
		onUpdate: (data: BulletListBlock['data']) => void;
	}
	let { data, onUpdate }: Props = $props();

	let inputRefs: HTMLInputElement[] = [];

	function updateItem(index: number, value: string) {
		const items = [...data.items];
		items[index] = value;
		onUpdate({ items });
	}

	function addItem() {
		onUpdate({ items: [...data.items, ''] });
		// Focus the new input on next tick
		setTimeout(() => inputRefs[data.items.length]?.focus(), 0);
	}

	function removeItem(index: number) {
		const items = data.items.filter((_, i) => i !== index);
		onUpdate({ items: items.length > 0 ? items : [''] });
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') { e.preventDefault(); addItem(); }
		if (e.key === 'Backspace' && data.items[index] === '' && data.items.length > 1) {
			e.preventDefault(); removeItem(index);
			setTimeout(() => inputRefs[index - 1]?.focus(), 0);
		}
	}

	function wrapSelection(index: number, tag: string) {
		const input = inputRefs[index];
		if (!input) return;
		const start = input.selectionStart ?? 0;
		const end = input.selectionEnd ?? 0;
		const selected = input.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		const newVal = input.value.slice(0, start) + wrapped + input.value.slice(end);
		updateItem(index, newVal);
		setTimeout(() => {
			input.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
			input.focus();
		}, 0);
	}

	let focusedIndex = $state(-1);
</script>

<div class="flex flex-col gap-2">
	<!-- Formatting toolbar - shows when an item is focused -->
	<div class="flex items-center gap-1 h-7">
		{#if focusedIndex >= 0}
			{#each [['b','B'],['i','I'],['l','U']] as [tag, label]}
				<button type="button" onclick={() => wrapSelection(focusedIndex, tag)}
					class="flex h-7 w-7 items-center justify-center rounded text-xs font-bold
					       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
					aria-label="Wrap in {tag} tag">
					{label}
				</button>
			{/each}
			<div class="mx-1 h-4 w-px bg-[var(--color-surface-600)]"></div>
			<span class="text-xs text-[var(--color-text-muted)]">Select text then click B/I/U</span>
		{:else}
			<span class="text-xs text-[var(--color-text-muted)]">Click an item to format text</span>
		{/if}
	</div>

	{#each data.items as item, index}
		<div class="flex items-center gap-2">
			<span class="shrink-0 text-[var(--color-text-muted)]">•</span>
			<input
				bind:this={inputRefs[index]}
				type="text"
				value={item}
				oninput={(e) => updateItem(index, (e.target as HTMLInputElement).value)}
				onkeydown={(e) => handleKeydown(e, index)}
				onfocus={() => (focusedIndex = index)}
				onblur={() => (focusedIndex = -1)}
				placeholder="List item…"
				class="flex-1 bg-transparent text-sm text-[var(--color-text-primary)]
				       placeholder:text-[var(--color-text-muted)] focus:outline-none"
			/>
			{#if data.items.length > 1}
				<button onclick={() => removeItem(index)} aria-label="Remove item"
					class="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			{/if}
		</div>
	{/each}

	<button onclick={addItem}
		class="mt-1 self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
		+ Add item
	</button>
</div>
