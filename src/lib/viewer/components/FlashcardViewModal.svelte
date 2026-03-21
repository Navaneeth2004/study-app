<script lang="ts">
	import type { Flashcard } from '$lib/creator/flashcardTypes';
	import FlipCard from '$lib/shared/components/FlipCard.svelte';

	interface Props {
		flashcard: Flashcard | null;
		onClose: () => void;
	}

	let { flashcard, onClose }: Props = $props();
</script>

{#if flashcard}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
		onclick={onClose}
	>
		<!-- Modal panel — stop clicks propagating to backdrop -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative w-full max-w-md flex flex-col gap-4"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Close button -->
			<div class="flex items-center justify-between">
				<span class="text-sm text-[var(--color-text-secondary)]">
					{flashcard.frontText.slice(0, 40)}{flashcard.frontText.length > 40 ? '…' : ''}
				</span>
				<button
					onclick={onClose}
					class="flex h-8 w-8 items-center justify-center rounded-lg
					       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-700)]
					       hover:text-[var(--color-text-primary)] transition-colors"
					aria-label="Close"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<FlipCard
				frontText={flashcard.frontText}
				frontImageUrl={flashcard.frontImageUrl}
				frontAudioUrl={flashcard.frontAudioUrl}
				backText={flashcard.backText}
				backImageUrl={flashcard.backImageUrl}
				backAudioUrl={flashcard.backAudioUrl}
			/>
		</div>
	</div>
{/if}