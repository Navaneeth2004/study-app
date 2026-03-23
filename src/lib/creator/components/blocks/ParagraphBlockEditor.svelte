<script lang="ts">
	import type { ParagraphBlock } from '$lib/creator/contentTypes';
	import { stripHtml } from '$lib/ocr/ocrUtils';
	import OCRModal from '$lib/shared/components/OCRModal.svelte';

	interface Props {
		data: ParagraphBlock['data'];
		onUpdate: (data: ParagraphBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();

	let textarea: HTMLTextAreaElement;
	let ocrOpen = $state(false);

	function wrapSelection(tag: string) {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		const newHtml = textarea.value.slice(0, start) + wrapped + textarea.value.slice(end);
		onUpdate({ html: newHtml });
		setTimeout(() => {
			textarea.setSelectionRange(
				start + tag.length + 2,
				start + tag.length + 2 + selected.length
			);
			textarea.focus();
		}, 0);
	}

	function handleOCRInsert(text: string) {
		onUpdate({ html: text });
	}
</script>

<OCRModal
	isOpen={ocrOpen}
	existingText={stripHtml(data.html)}
	onInsert={handleOCRInsert}
	onClose={() => (ocrOpen = false)}
/>

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

		<!-- Divider -->
		<div class="mx-1 h-4 w-px bg-[var(--color-surface-600)]"></div>

		<!-- OCR scan button -->
		<button
			type="button"
			onclick={() => (ocrOpen = true)}
			class="flex h-7 w-7 items-center justify-center rounded text-xs
			       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)]
			       hover:text-[var(--color-text-primary)] transition-colors"
			aria-label="Extract text from image"
			title="Extract text from image (OCR)"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
				<circle cx="12" cy="13" r="4"/>
			</svg>
		</button>
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
