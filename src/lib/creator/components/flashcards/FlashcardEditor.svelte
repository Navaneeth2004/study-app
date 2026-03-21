<script lang="ts">
	import { onMount } from 'svelte';
	import type { Flashcard, FlashcardForm } from '$lib/creator/flashcardTypes';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';
	import AIGenerationModal from '$lib/shared/components/AIGenerationModal.svelte';
	import type { AIGenerationResult } from '$lib/ai/aiTypes';

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
	let showAIModal = $state(false);

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

	const aiExistingContent = $derived(
		[frontText, backText].filter(Boolean).join('\n\n')
	);

	function handleAIInsert(result: AIGenerationResult) {
		if (result.outputType !== 'flashcards') return;
		const cards = result.data.flashcards;
		if (!Array.isArray(cards) || cards.length === 0) return;
		const first = cards[0] as { front_text: string; back_text: string };
		frontText = first.front_text ?? '';
		backText = first.back_text ?? '';
		isDirty = true;
	}

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

{#if showAIModal}
	<AIGenerationModal
		isOpen={true}
		outputType="flashcards"
		existingContent={aiExistingContent}
		onInsert={handleAIInsert}
		onClose={() => (showAIModal = false)}
	/>
{/if}

<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-accent-500)]/30
            bg-[var(--color-surface-900)] p-5">

	<!-- Header row -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">
			{flashcard ? 'Edit Flashcard' : 'New Flashcard'}
		</h3>
		<div class="flex items-center gap-2">
			<button
				onclick={() => (showAIModal = true)}
				class="flex items-center gap-1.5 rounded-lg border border-[var(--color-surface-600)]
				       px-3 py-1 text-xs text-[var(--color-text-secondary)]
				       hover:text-[var(--color-text-primary)] transition-colors"
			>
				<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
				</svg>
				Generate
			</button>
			<button
				onclick={() => (previewMode = !previewMode)}
				class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
			>
				{previewMode ? 'Back to Edit' : 'Preview'}
			</button>
		</div>
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
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Front panel -->
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-800)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Front</span>

				<textarea bind:value={frontText} placeholder="Front side text…" rows={3}
					class="w-full resize-none bg-transparent text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)] focus:outline-none"></textarea>

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
