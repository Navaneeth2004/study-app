<script lang="ts">
	import type { TitleBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: TitleBlock['data'];
		onUpdate: (data: TitleBlock['data']) => void;
	}
	let { data, onUpdate }: Props = $props();

	let inputEl: HTMLInputElement;

	function wrapSelection(tag: string) {
		const start = inputEl.selectionStart ?? 0;
		const end = inputEl.selectionEnd ?? 0;
		const selected = inputEl.value.slice(start, end);
		const newVal = inputEl.value.slice(0, start) + `<${tag}>${selected}</${tag}>` + inputEl.value.slice(end);
		onUpdate({ text: newVal });
		setTimeout(() => {
			inputEl.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
			inputEl.focus();
		}, 0);
	}
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-center gap-0.5">
		{#each [['b','B'],['i','I'],['l','L']] as [tag, label]}
			<button type="button" onclick={() => wrapSelection(tag)}
				class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Wrap {tag}">{label}</button>
		{/each}
	</div>
	<input
		bind:this={inputEl}
		type="text"
		value={data.text}
		oninput={(e) => onUpdate({ text: (e.target as HTMLInputElement).value })}
		placeholder="Title text…"
		class="w-full bg-transparent text-2xl font-display font-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
	/>
</div>
