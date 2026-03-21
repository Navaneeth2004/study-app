<script lang="ts">
	import type { BulletListBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: BulletListBlock['data'];
		onUpdate: (data: BulletListBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();

	function updateItem(index: number, value: string) {
		const items = [...data.items];
		items[index] = value;
		onUpdate({ items });
	}

	function addItem() {
		onUpdate({ items: [...data.items, ''] });
	}

	function removeItem(index: number) {
		const items = data.items.filter((_, i) => i !== index);
		onUpdate({ items: items.length > 0 ? items : [''] });
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addItem();
		}
		if (e.key === 'Backspace' && data.items[index] === '' && data.items.length > 1) {
			e.preventDefault();
			removeItem(index);
		}
	}
</script>

<div class="flex flex-col gap-1.5">
	{#each data.items as item, index}
		<div class="flex items-center gap-2">
			<span class="shrink-0 text-[var(--color-text-muted)]">•</span>
			<input
				type="text"
				value={item}
				oninput={(e) => updateItem(index, (e.target as HTMLInputElement).value)}
				onkeydown={(e) => handleKeydown(e, index)}
				placeholder="List item…"
				class="flex-1 bg-transparent text-sm text-[var(--color-text-primary)]
				       placeholder:text-[var(--color-text-muted)] focus:outline-none"
			/>
			{#if data.items.length > 1}
				<button
					onclick={() => removeItem(index)}
					aria-label="Remove item"
					class="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-400)]
					       transition-colors"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			{/if}
		</div>
	{/each}

	<button
		onclick={addItem}
		class="mt-1 self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]
		       transition-colors"
	>
		+ Add item
	</button>
</div>