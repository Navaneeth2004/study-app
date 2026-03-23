<script lang="ts">
	import { onMount } from 'svelte';
	import type { Flashcard, FlashcardForm } from '$lib/creator/flashcardTypes';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';
	import OCRModal from '$lib/shared/components/OCRModal.svelte';

	// OCR state
	let ocrTarget = $state<'front' | 'back' | null>(null);

	interface Props {
		flashcard: Flashcard | null;
		onSave: (data: FlashcardForm) => Promise<void>;
		onCancel: () => void;
		isDirty?: boolean;
	}

	let { flashcard, onSave, onCancel, isDirty = $bindable(false) }: Props = $props();

	// Initialise local state on mount from prop — avoids Svelte 5 snapshot warning
	let frontText = $state('');
	let backText = $state('');
	let frontImageFile = $state<File | undefined>(undefined);
	let backImageFile = $state<File | undefined>(undefined);
	let frontAudioFile = $state<File | undefined>(undefined);
	let backAudioFile = $state<File | undefined>(undefined);
	let frontImagePreview = $state('');
	let backImagePreview = $state('');
	let frontAudioPreview = $state('');
	let backAudioPreview = $state('');
	let saving = $state(false);
	let error = $state('');
	let previewMode = $state(false);

	onMount(() => {
		frontText = flashcard?.frontText ?? '';
		backText = flashcard?.backText ?? '';
		frontImagePreview = flashcard?.frontImageUrl ?? '';
		backImagePreview = flashcard?.backImageUrl ?? '';
		frontAudioPreview = flashcard?.frontAudioUrl ?? '';
		backAudioPreview = flashcard?.backAudioUrl ?? '';
	});

	// Track dirty state
	$effect(() => {
		const changed =
			frontText !== (flashcard?.frontText ?? '') ||
			backText !== (flashcard?.backText ?? '') ||
			!!frontImageFile || !!backImageFile ||
			!!frontAudioFile || !!backAudioFile;
		isDirty = changed;
	});

	async function handleSave() {
		if (!frontText.trim()) { error = 'Front text is required.'; return; }
		if (!backText.trim()) { error = 'Back text is required.'; return; }
		saving = true;
		error = '';
		try {
			await onSave({
				frontText: frontText.trim(),
				backText: backText.trim(),
				frontImageFile,
				backImageFile,
				frontAudioFile,
				backAudioFile,
				frontImageUrl: frontImagePreview,
				backImageUrl: backImagePreview,
				frontAudioUrl: frontAudioPreview,
				backAudioUrl: backAudioPreview
			});
			isDirty = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save flashcard.';
		} finally {
			saving = false;
		}
	}

	function handleOCRInsert(text: string) {
		if (ocrTarget === 'front') { frontText = text; }
		else if (ocrTarget === 'back') { backText = text; }
		isDirty = true;
		ocrTarget = null;
	}

	function handleFrontImage(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		frontImageFile = file;
		frontImagePreview = URL.createObjectURL(file);
	}

	function handleBackImage(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		backImageFile = file;
		backImagePreview = URL.createObjectURL(file);
	}

	function handleFrontAudio(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		frontAudioFile = file;
		frontAudioPreview = URL.createObjectURL(file);
	}

	function handleBackAudio(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		backAudioFile = file;
		backAudioPreview = URL.createObjectURL(file);
	}
</script>

<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-accent-500)]/30
            bg-[var(--color-surface-900)] p-5">

	<!-- Header row -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">
			{flashcard ? 'Edit Flashcard' : 'New Flashcard'}
		</h3>
		<button
			onclick={() => (previewMode = !previewMode)}
			class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
			       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
		>
			{previewMode ? 'Back to Edit' : 'Preview'}
		</button>
	</div>

	{#if previewMode}
		<FlipCard
			{frontText}
			frontImageUrl={frontImagePreview}
			frontAudioUrl={frontAudioPreview}
			{backText}
			backImageUrl={backImagePreview}
			backAudioUrl={backAudioPreview}
		/>
	{:else}
		<!-- OCR Modal -->
		<OCRModal
			isOpen={ocrTarget !== null}
			existingText={ocrTarget === 'front' ? frontText : backText}
			onInsert={handleOCRInsert}
			onClose={() => (ocrTarget = null)}
		/>

		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Front panel -->
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-800)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Front</span>

				<textarea bind:value={frontText} placeholder="Front side text…" rows={3}
					class="w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)] focus:outline-none"></textarea>
				<!-- OCR scan button -->
				<button type="button" onclick={() => (ocrTarget = 'front')}
					class="self-start flex items-center gap-1 text-xs text-[var(--color-text-muted)]
					       hover:text-[var(--color-accent-400)] transition-colors"
					aria-label="Extract text from image (front)">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
						<circle cx="12" cy="13" r="4"/>
					</svg>
					Scan
				</button>

				<!-- Front image -->
				{#if frontImagePreview}
					<div class="relative">
						<img src={frontImagePreview} alt="Front" class="w-full rounded-lg object-cover max-h-28 border border-[var(--color-surface-700)]" />
						<button onclick={() => { frontImagePreview = ''; frontImageFile = undefined; }}
							class="absolute right-1.5 top-1.5 rounded-md bg-[var(--color-surface-900)]/80
							       px-2 py-0.5 text-xs text-[var(--color-error-400)] hover:bg-[var(--color-surface-900)] transition-colors">
							Remove
						</button>
					</div>
				{:else}
					<label class="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)]
					              hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
						</svg>
						Add image
						<input type="file" accept="image/*" onchange={handleFrontImage} class="hidden" />
					</label>
				{/if}

				<!-- Front audio -->
				{#if frontAudioPreview}
					<div class="flex flex-col gap-1">
						<audio controls src={frontAudioPreview} class="w-full rounded-lg h-8"></audio>
						<button onclick={() => { frontAudioPreview = ''; frontAudioFile = undefined; }}
							class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
							Remove audio
						</button>
					</div>
				{:else}
					<label class="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)]
					              hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
						</svg>
						Add audio
						<input type="file" accept="audio/*" onchange={handleFrontAudio} class="hidden" />
					</label>
				{/if}
			</div>

			<!-- Back panel -->
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-800)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Back</span>

				<textarea bind:value={backText} placeholder="Back side text…" rows={3}
					class="w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)] focus:outline-none"></textarea>
				<!-- OCR scan button -->
				<button type="button" onclick={() => (ocrTarget = 'back')}
					class="self-start flex items-center gap-1 text-xs text-[var(--color-text-muted)]
					       hover:text-[var(--color-accent-400)] transition-colors"
					aria-label="Extract text from image (back)">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
						<circle cx="12" cy="13" r="4"/>
					</svg>
					Scan
				</button>

				<!-- Back image -->
				{#if backImagePreview}
					<div class="relative">
						<img src={backImagePreview} alt="Back" class="w-full rounded-lg object-cover max-h-28 border border-[var(--color-surface-700)]" />
						<button onclick={() => { backImagePreview = ''; backImageFile = undefined; }}
							class="absolute right-1.5 top-1.5 rounded-md bg-[var(--color-surface-900)]/80
							       px-2 py-0.5 text-xs text-[var(--color-error-400)] hover:bg-[var(--color-surface-900)] transition-colors">
							Remove
						</button>
					</div>
				{:else}
					<label class="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)]
					              hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
						</svg>
						Add image
						<input type="file" accept="image/*" onchange={handleBackImage} class="hidden" />
					</label>
				{/if}

				<!-- Back audio -->
				{#if backAudioPreview}
					<div class="flex flex-col gap-1">
						<audio controls src={backAudioPreview} class="w-full rounded-lg h-8"></audio>
						<button onclick={() => { backAudioPreview = ''; backAudioFile = undefined; }}
							class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
							Remove audio
						</button>
					</div>
				{:else}
					<label class="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)]
					              hover:text-[var(--color-text-secondary)] transition-colors">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
						</svg>
						Add audio
						<input type="file" accept="audio/*" onchange={handleBackAudio} class="hidden" />
					</label>
				{/if}
			</div>
		</div>

		{#if error}
			<p class="text-sm text-[var(--color-error-400)]">{error}</p>
		{/if}

		<div class="flex gap-3">
			{#if isDirty}
				<button onclick={handleSave} disabled={saving}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
					       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)]
					       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
					{saving ? 'Saving…' : 'Save'}
				</button>
				<button onclick={onCancel} disabled={saving}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
					       disabled:opacity-50 transition-colors">
					Cancel
				</button>
			{/if}
		</div>
	{/if}
</div>