<script lang="ts">
	import { extractText } from '$lib/ocr/ocrService';
	import { isImageFile, formatConfidence, confidenceLevel } from '$lib/ocr/ocrUtils';
	import { getAvailableProviders } from '$lib/settings/aiKeyStore';
	import { getKey } from '$lib/settings/aiKeyStore';
	import type { OCRProvider, OCRProgress, OCRResult } from '$lib/ocr/ocrTypes';
	import type { AIProvider } from '$lib/ai/aiTypes';

	interface Props {
		isOpen: boolean;
		existingText: string;
		onInsert: (text: string) => void;
		onClose: () => void;
	}

	let { isOpen, existingText, onInsert, onClose }: Props = $props();

	type Step = 'provider' | 'upload' | 'extracting' | 'result';

	let step = $state<Step>('provider');
	let provider = $state<OCRProvider>('tesseract');
	let selectedAIProvider = $state<AIProvider | null>(null);
	let imageFile = $state<File | null>(null);
	let previewUrl = $state('');
	let extracting = $state(false);
	let progress = $state<OCRProgress | null>(null);
	let result = $state<OCRResult | null>(null);
	let editedText = $state('');
	let insertMode = $state<'replace' | 'append'>('replace');
	let error = $state('');
	let dropTarget = $state(false);

	const availableAI = $derived(getAvailableProviders());
	const hasAI = $derived(availableAI.length > 0);

	const AI_LABELS: Record<string, string> = {
		openai: 'OpenAI (GPT-4o)',
		anthropic: 'Anthropic (Claude)',
		gemini: 'Google Gemini',
		groq: 'Groq'
	};

	const confLevel = $derived(
		result?.confidence !== undefined ? confidenceLevel(result.confidence) : null
	);
	const confLabel = $derived(
		result?.confidence !== undefined ? formatConfidence(result.confidence) : null
	);

	const preview = $derived.by(() => {
		if (!editedText) return '';
		if (insertMode === 'replace') return editedText;
		return existingText ? existingText + '\n' + editedText : editedText;
	});

	function reset() {
		step = 'provider';
		imageFile = null;
		previewUrl = '';
		result = null;
		editedText = '';
		error = '';
		progress = null;
	}

	function handleClose() {
		if (!extracting) { reset(); onClose(); }
	}

	function selectProvider(p: OCRProvider) {
		provider = p;
		if (p === 'ai' && availableAI.length > 0 && !selectedAIProvider) {
			selectedAIProvider = availableAI[0];
		}
	}

	function handleFileInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) setFile(file);
	}

	function setFile(file: File) {
		if (!isImageFile(file)) { error = 'Please select an image file.'; return; }
		imageFile = file;
		previewUrl = URL.createObjectURL(file);
		error = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dropTarget = false;
		const file = e.dataTransfer?.files[0];
		if (file) setFile(file);
	}

	function removeImage() {
		imageFile = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = '';
	}

	async function runExtract() {
		if (!imageFile) return;
		extracting = true;
		error = '';
		step = 'extracting';
		progress = { status: 'Starting…', progress: 0 };
		try {
			const r = await extractText(
				{
					provider,
					imageFile,
					aiProvider: selectedAIProvider ?? undefined,
					aiApiKey: selectedAIProvider ? getKey(selectedAIProvider) : undefined
				},
				(p) => { progress = p; }
			);
			result = r;
			editedText = r.text;
			step = 'result';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Extraction failed.';
			step = 'upload';
		} finally {
			extracting = false;
		}
	}

	function handleInsert() {
		onInsert(preview);
		reset();
		onClose();
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
	     onclick={handleClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border
		            border-[var(--color-surface-700)] bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>

			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<div class="flex flex-col gap-0.5">
					<span class="text-sm font-semibold text-[var(--color-text-primary)]">Extract text from image</span>
					{#if step !== 'provider'}
						<span class="text-xs text-[var(--color-text-muted)] capitalize">
							{provider === 'tesseract' ? 'Tesseract (Free)' : AI_LABELS[selectedAIProvider ?? ''] ?? 'AI Vision'}
						</span>
					{/if}
				</div>
				<button onclick={handleClose} disabled={extracting} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
					       disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="flex flex-col gap-5 p-5">

				<!-- ── STEP A: Provider selection ────────────────────────────── -->
				{#if step === 'provider'}
					<div class="grid grid-cols-2 gap-3">
						<!-- Tesseract -->
						<button onclick={() => selectProvider('tesseract')}
							class="flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors
							       {provider === 'tesseract'
								? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/5'
								: 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)]'}">
							<div class="flex items-center gap-2">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
								     class="{provider==='tesseract'?'text-[var(--color-accent-400)]':'text-[var(--color-text-muted)]'}">
									<rect x="3" y="3" width="18" height="18" rx="2"/>
									<circle cx="8.5" cy="8.5" r="1.5"/>
									<polyline points="21 15 16 10 5 21"/>
								</svg>
								<span class="text-xs font-semibold
								       {provider==='tesseract'?'text-[var(--color-accent-400)]':'text-[var(--color-text-secondary)]'}">
									Free &amp; Offline
								</span>
							</div>
							<p class="text-xs text-[var(--color-text-muted)] leading-relaxed">
								Works without internet. Good for clear printed text.
							</p>
						</button>

						<!-- AI Vision -->
						<button onclick={() => hasAI && selectProvider('ai')}
							disabled={!hasAI}
							class="flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors
							       {!hasAI ? 'border-[var(--color-surface-700)] opacity-50 cursor-not-allowed' :
							        provider === 'ai'
								? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/5'
								: 'border-[var(--color-surface-600)] hover:border-[var(--color-surface-500)]'}">
							<div class="flex items-center gap-2">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
								     class="{provider==='ai'&&hasAI?'text-[var(--color-accent-400)]':'text-[var(--color-text-muted)]'}">
									<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
								</svg>
								<span class="text-xs font-semibold
								       {provider==='ai'&&hasAI?'text-[var(--color-accent-400)]':'text-[var(--color-text-secondary)]'}">
									AI-Powered
								</span>
							</div>
							{#if !hasAI}
								<p class="text-xs text-[var(--color-text-muted)] leading-relaxed">
									Add an API key in
									<a href="/settings" onclick={handleClose}
									   class="text-[var(--color-accent-400)] hover:underline">
										Settings → AI Settings
									</a>
								</p>
							{:else}
								<p class="text-xs text-[var(--color-text-muted)] leading-relaxed">
									More accurate. Uses your saved API key.
								</p>
							{/if}
						</button>
					</div>

					<!-- AI provider picker -->
					{#if provider === 'ai' && availableAI.length > 0}
						<div class="flex flex-col gap-1.5">
							<label for="ai-provider" class="text-xs font-medium text-[var(--color-text-secondary)]">AI Provider</label>
							<div class="relative">
								<select id="ai-provider" bind:value={selectedAIProvider}
									class="w-full appearance-none rounded-xl border border-[var(--color-surface-600)]
									       bg-[var(--color-surface-800)] px-3 py-2 pr-9 text-sm
									       text-[var(--color-text-primary)] focus:border-[var(--color-accent-500)]
									       focus:outline-none transition-colors cursor-pointer"
									style="color-scheme: dark;">
									{#each availableAI as ap}
										<option value={ap}
										        style="background: var(--color-surface-800); color: var(--color-text-primary);">
											{AI_LABELS[ap] ?? ap}
										</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
								          text-[var(--color-text-muted)]">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
									     stroke-width="2" stroke-linecap="round">
										<polyline points="6 9 12 15 18 9"/>
									</svg>
								</div>
							</div>
						</div>
					{/if}

					<button onclick={() => (step = 'upload')}
						disabled={provider === 'ai' && (!hasAI || !selectedAIProvider)}
						class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white
						       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
						Continue
					</button>

				<!-- ── STEP B: Image upload ───────────────────────────────── -->
				{:else if step === 'upload'}
					<button onclick={() => (step = 'provider')}
						class="flex items-center gap-1.5 self-start text-xs text-[var(--color-text-muted)]
						       hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
						Change provider
					</button>

					{#if !imageFile}
						<!-- Drop zone -->
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<label
							class="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
							       py-10 cursor-pointer transition-colors
							       {dropTarget
								? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/5'
								: 'border-[var(--color-surface-600)] hover:border-[var(--color-accent-500)]/50'}"
							ondragover={(e) => { e.preventDefault(); dropTarget = true; }}
							ondragleave={() => (dropTarget = false)}
							ondrop={handleDrop}
						>
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							     stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"
							     class="text-[var(--color-text-muted)]">
								<rect x="3" y="3" width="18" height="18" rx="2"/>
								<circle cx="8.5" cy="8.5" r="1.5"/>
								<polyline points="21 15 16 10 5 21"/>
							</svg>
							<div class="flex flex-col items-center gap-1 text-center">
								<span class="text-sm text-[var(--color-text-secondary)]">Drop an image here or click to browse</span>
								<span class="text-xs text-[var(--color-text-muted)]">JPG, PNG, WebP, GIF</span>
							</div>
							<!-- Regular file picker -->
							<input type="file" accept="image/*" onchange={handleFileInput} class="hidden" />
						</label>

						<!-- Mobile: camera capture -->
						<label class="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-surface-600)]
						             px-4 py-2.5 text-sm text-[var(--color-text-secondary)] cursor-pointer
						             hover:border-[var(--color-surface-500)] hover:text-[var(--color-text-primary)] transition-colors sm:hidden">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
								<circle cx="12" cy="13" r="4"/>
							</svg>
							Take photo
							<input type="file" accept="image/*" capture="environment" onchange={handleFileInput} class="hidden" />
						</label>
					{:else}
						<!-- Image preview -->
						<div class="flex flex-col gap-3">
							<div class="relative rounded-xl overflow-hidden border border-[var(--color-surface-700)]"
							     style="max-height:200px;">
								<img src={previewUrl} alt="Selected" class="w-full object-contain" style="max-height:200px;" />
							</div>
							<div class="flex items-center justify-between gap-3">
								<span class="truncate text-xs text-[var(--color-text-muted)]">{imageFile.name}</span>
								<button onclick={removeImage}
									class="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
									Remove
								</button>
							</div>
						</div>
					{/if}

					{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

					<button onclick={runExtract} disabled={!imageFile}
						class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white
						       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
						Extract Text
					</button>

				<!-- ── STEP C: Extracting ────────────────────────────────── -->
				{:else if step === 'extracting'}
					<div class="flex flex-col items-center gap-5 py-6">
						{#if provider === 'tesseract' && progress}
							<div class="w-full flex flex-col gap-2">
								<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
									<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300"
									     style="width:{Math.round((progress.progress ?? 0) * 100)}%">
									</div>
								</div>
								<p class="text-center text-xs text-[var(--color-text-muted)] capitalize">{progress.status}</p>
							</div>
						{:else}
							<svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none"
							     stroke="currentColor" stroke-width="2" stroke-linecap="round"
							     style="color:var(--color-accent-400)">
								<path d="M21 12a9 9 0 11-6.219-8.56"/>
							</svg>
							<p class="text-sm text-[var(--color-text-secondary)]">
								{progress?.status ?? 'Extracting text…'}
							</p>
						{/if}
					</div>

				<!-- ── STEP D: Result ────────────────────────────────────── -->
				{:else if step === 'result' && result}
					<!-- Confidence (Tesseract only) -->
					{#if result.confidence !== undefined && confLabel}
						<p class="text-xs font-medium
						       {confLevel === 'high' ? 'text-[var(--color-success-500)]' :
						        confLevel === 'medium' ? 'text-[var(--color-warning-400)]' :
						        'text-[var(--color-error-400)]'}">
							{confLabel}
						</p>
					{/if}

					<!-- Editable result textarea -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-[var(--color-text-secondary)]">Extracted text (editable)</span>
						<textarea bind:value={editedText} rows={6}
							class="w-full resize-y rounded-xl border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-3 py-2 text-sm
							       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors">
						</textarea>
					</div>

					<!-- Replace / Append selector (only when existing text) -->
					{#if existingText}
						<div class="flex flex-col gap-2">
							<span class="text-xs font-medium text-[var(--color-text-secondary)]">How to insert</span>
							<div class="flex gap-2">
								{#each (['replace', 'append'] as const) as mode}
									<button onclick={() => (insertMode = mode)}
										class="flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors
										       {insertMode === mode
											? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
											: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
										{mode}
									</button>
								{/each}
							</div>
							<!-- Preview -->
							<div class="flex flex-col gap-1">
								<span class="text-xs text-[var(--color-text-muted)]">Preview</span>
								<div class="max-h-28 overflow-y-auto rounded-xl border border-[var(--color-surface-700)]
								            bg-[var(--color-surface-800)] px-3 py-2 text-xs
								            text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
									{preview}
								</div>
							</div>
						</div>
					{/if}

					<div class="flex gap-2">
						<button onclick={handleInsert} disabled={!editedText.trim()}
							class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium
							       text-white hover:bg-[var(--color-accent-400)]
							       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
							{existingText ? (insertMode === 'replace' ? 'Replace' : 'Append') : 'Insert'}
						</button>
						<button onclick={() => { step = 'upload'; result = null; editedText = ''; }}
							class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
							       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
							Extract again
						</button>
					</div>
				{/if}

			</div>
		</div>
	</div>
{/if}
