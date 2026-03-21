<script lang="ts">
	import type { Flashcard, FlashcardForm } from '$lib/creator/flashcardTypes';
	import FlashcardEditor from './FlashcardEditor.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';

	interface Props {
		flashcard: Flashcard | null;
		onSave: (data: FlashcardForm) => Promise<void>;
		onClose: () => void;
	}

	let { flashcard, onSave, onClose }: Props = $props();

	let isDirty = $state(false);
	let showDirtyGuard = $state(false);

	function attemptClose() {
		if (isDirty) {
			showDirtyGuard = true;
		} else {
			onClose();
		}
	}

	async function handleSave(data: FlashcardForm) {
		await onSave(data);
		onClose();
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70"
	onclick={attemptClose}
>
	<!-- Modal panel — stop clicks propagating -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl
		       border border-[var(--color-surface-700)] bg-[var(--color-surface-950)] shadow-2xl"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Close button -->
		<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-3">
			<span class="text-sm font-semibold text-[var(--color-text-secondary)]">
				{flashcard ? 'Edit Flashcard' : 'New Flashcard'}
			</span>
			<button
				onclick={attemptClose}
				class="flex h-7 w-7 items-center justify-center rounded-lg
				       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
				       hover:text-[var(--color-text-primary)] transition-colors"
				aria-label="Close"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<div class="p-5">
			<FlashcardEditor
				{flashcard}
				onSave={handleSave}
				onCancel={attemptClose}
				bind:isDirty
			/>
		</div>
	</div>
</div>

<!-- Dirty guard — shown when user tries to close with unsaved changes -->
<UnsavedChangesModal
	isOpen={showDirtyGuard}
	saving={false}
	onSave={async () => { showDirtyGuard = false; }}
	onLeave={() => { showDirtyGuard = false; onClose(); }}
	onStay={() => (showDirtyGuard = false)}
/>
