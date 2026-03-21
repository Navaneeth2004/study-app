<script lang="ts">
	import type { ParagraphBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: ParagraphBlock['data'];
		onUpdate: (data: ParagraphBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();

	let textarea: HTMLTextAreaElement;

	function wrapSelection(tag: string) {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		const newHtml =
			textarea.value.slice(0, start) + wrapped + textarea.value.slice(end);
		onUpdate({ html: newHtml });
		// Restore cursor after the wrapped text
		setTimeout(() => {
			textarea.setSelectionRange(
				start + tag.length + 2,
				start + tag.length + 2 + selected.length
			);
			textarea.focus();
		}, 0);
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-1">
		{#each [['b', 'B'], ['i', 'I'], ['l', 'L']] as [tag, label]}
			<button
				type="button"
				onclick={() => wrapSelection(tag)}
				class="flex h-7 w-7 items-center justify-center rounded text-xs font-bold
				       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)]
				       hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Wrap in {tag} tag"
			>
				{label}
			</button>
		{/each}
	</div>
	<textarea
		bind:this={textarea}
		value={data.html}
		oninput={(e) => onUpdate({ html: (e.target as HTMLTextAreaElement).value })}
		placeholder="Paragraph content…"
		rows={4}
		class="w-full resize-y bg-transparent text-sm text-[var(--color-text-primary)]
		       placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
	></textarea>
</div>