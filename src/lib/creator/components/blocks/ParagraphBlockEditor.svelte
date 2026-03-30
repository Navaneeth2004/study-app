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
	let showLinkDialog = $state(false);
	let linkUrl = $state('');
	let linkText = $state('');

	function wrapSelection(tag: string) {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selected = textarea.value.slice(start, end);
		const wrapped = `<${tag}>${selected}</${tag}>`;
		const newHtml = textarea.value.slice(0, start) + wrapped + textarea.value.slice(end);
		onUpdate({ html: newHtml });
		setTimeout(() => {
			textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
			textarea.focus();
		}, 0);
	}

	function openLinkDialog() {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		linkText = textarea.value.slice(start, end) || '';
		linkUrl = '';
		showLinkDialog = true;
	}

	function insertLink() {
		if (!linkUrl.trim()) { showLinkDialog = false; return; }
		const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
		const display = linkText.trim() || url;
		const tag = `<a href="${url}">${display}</a>`;
		const start = textarea.selectionStart;
		const newHtml = textarea.value.slice(0, start) + tag + textarea.value.slice(textarea.selectionEnd);
		onUpdate({ html: newHtml });
		showLinkDialog = false;
		linkUrl = ''; linkText = '';
	}

	function handleOCRInsert(text: string) { onUpdate({ html: text }); }
</script>

<OCRModal isOpen={ocrOpen} existingText={stripHtml(data.html)} onInsert={handleOCRInsert} onClose={() => (ocrOpen = false)} />

<!-- Link dialog -->
{#if showLinkDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onclick={() => (showLinkDialog = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="w-full max-w-sm flex flex-col gap-4 rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-5 shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<h3 class="text-sm font-semibold text-[var(--color-text-primary)]">Insert link</h3>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-[var(--color-text-secondary)]">URL</label>
				<input type="url" bind:value={linkUrl} placeholder="https://example.com"
					onkeydown={(e) => e.key === 'Enter' && insertLink()}
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-[var(--color-text-secondary)]">Display text <span class="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
				<input type="text" bind:value={linkText} placeholder="Link text…"
					onkeydown={(e) => e.key === 'Enter' && insertLink()}
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
			</div>
			<div class="flex gap-2">
				<button onclick={insertLink} disabled={!linkUrl.trim()}
					class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">
					Insert
				</button>
				<button onclick={() => (showLinkDialog = false)}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="flex flex-col gap-2">
	<div class="flex items-center gap-1">
		{#each [['b', 'B'], ['i', 'I'], ['l', 'L']] as [tag, label]}
			<button type="button" onclick={() => wrapSelection(tag)}
				class="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Wrap in {tag} tag">{label}</button>
		{/each}

		<!-- Divider -->
		<div class="mx-1 h-4 w-px bg-[var(--color-surface-600)]"></div>

		<!-- Link button -->
		<button type="button" onclick={openLinkDialog}
			class="flex h-7 items-center gap-1 rounded px-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
			title="Insert link">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
				<path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
			</svg>
			Link
		</button>

		<!-- Divider -->
		<div class="mx-1 h-4 w-px bg-[var(--color-surface-600)]"></div>

		<!-- OCR -->
		<button type="button" onclick={() => (ocrOpen = true)}
			class="flex h-7 w-7 items-center justify-center rounded text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-700)] hover:text-[var(--color-text-primary)] transition-colors"
			title="Extract text from image (OCR)">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
		class="w-full resize-y bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
	></textarea>
</div>
