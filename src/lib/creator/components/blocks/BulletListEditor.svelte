<script lang="ts">
	import type { BulletListBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: BulletListBlock['data'];
		onUpdate: (data: BulletListBlock['data']) => void;
	}
	let { data, onUpdate }: Props = $props();

	// Keep refs as array — indexed by position
	let inputRefs: (HTMLInputElement | null)[] = $state([]);
	let focusedIndex = $state(-1);

	function updateItem(index: number, value: string) {
		const items = [...data.items];
		items[index] = value;
		onUpdate({ items });
	}

	function addItem() {
		const items = [...data.items, ''];
		onUpdate({ items });
		// Focus the new input on next tick
		setTimeout(() => inputRefs[items.length - 1]?.focus(), 0);
	}

	function removeItem(index: number) {
		if (data.items.length <= 1) return;
		const items = data.items.filter((_, i) => i !== index);
		onUpdate({ items });
		setTimeout(() => inputRefs[Math.max(0, index - 1)]?.focus(), 0);
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') { e.preventDefault(); addItem(); }
		if (e.key === 'Backspace' && data.items[index] === '' && data.items.length > 1) {
			e.preventDefault();
			removeItem(index);
		}
	}

	// Wrap selected text in the currently focused input
	function wrapSelection(tag: string) {
		const idx = focusedIndex;
		if (idx < 0) return;
		const input = inputRefs[idx];
		if (!input) return;

		// Re-focus the input first so selection is still valid
		input.focus();

		const start = input.selectionStart ?? 0;
		const end = input.selectionEnd ?? 0;
		const selected = input.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		const newVal = input.value.slice(0, start) + wrapped + input.value.slice(end);

		updateItem(idx, newVal);

		// Restore cursor inside the wrapped content
		setTimeout(() => {
			input.focus();
			const newCursorPos = start + tag.length + 2 + selected.length;
			input.setSelectionRange(start + tag.length + 2, newCursorPos);
		}, 0);
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Formatting toolbar — always visible, dimmed when nothing focused -->
	<div class="flex items-center gap-1 border-b border-[var(--color-surface-700)] pb-2 mb-1">
		{#each [['b', 'B', 'Bold'], ['i', 'I', 'Italic'], ['l', 'U', 'Underline']] as [tag, label, title]}
			<button
				type="button"
				onmousedown={(e) => {
					// Prevent blur on input before we read selection
					e.preventDefault();
					wrapSelection(tag);
				}}
				title={title}
				class="flex h-7 w-7 items-center justify-center rounded text-xs font-bold
				       {focusedIndex >= 0
					? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)]'
					: 'text-[var(--color-text-muted)] opacity-50'}
				       transition-colors"
			>
				{#if tag === 'b'}<strong>{label}</strong>
				{:else if tag === 'i'}<em>{label}</em>
				{:else}<span style="text-decoration:underline">{label}</span>
				{/if}
			</button>
		{/each}
		{#if focusedIndex < 0}
			<span class="text-xs text-[var(--color-text-muted)] ml-1">Click a bullet to format text</span>
		{:else}
			<span class="text-xs text-[var(--color-text-muted)] ml-1">Select text then B / I / U</span>
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
				onblur={() => {
					// Small delay so onmousedown on toolbar button fires first
					setTimeout(() => {
						if (focusedIndex === index) focusedIndex = -1;
					}, 150);
				}}
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
