<script lang="ts">
	import ImageZoomModal from './ImageZoomModal.svelte';

	interface Props {
		frontText: string;
		frontImageUrl?: string;
		frontAudioUrl?: string;
		backText: string;
		backImageUrl?: string;
		backAudioUrl?: string;
	}

	let {
		frontText, frontImageUrl = '', frontAudioUrl = '',
		backText, backImageUrl = '', backAudioUrl = ''
	}: Props = $props();

	let flipped = $state(false);
	let zoomSrc = $state('');
</script>

{#if zoomSrc}
	<ImageZoomModal src={zoomSrc} onClose={() => (zoomSrc = '')} />
{/if}

<div class="w-full" style="perspective: 1000px; height: 260px; overflow: hidden;">
	<button
		onclick={() => (flipped = !flipped)}
		class="relative w-full h-full cursor-pointer"
		aria-label="Flip card"
		style="transform-style: preserve-3d; transition: transform 0.5s; transform: {flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}"
	>
		<!-- Front face -->
		<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-800)] p-5 overflow-hidden"
		     style="backface-visibility: hidden; -webkit-backface-visibility: hidden;">
			<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Front</span>
			<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
				<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{frontText}</p>
				{#if frontImageUrl}
					<div class="flex items-center justify-center overflow-hidden" style="max-height: 100px; width: 100%;">
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<img src={frontImageUrl} alt="Front"
							class="rounded-lg border border-[var(--color-surface-700)] cursor-zoom-in"
							style="max-width: 100%; max-height: 100px; object-fit: contain;"
							onclick={(e) => { e.stopPropagation(); zoomSrc = frontImageUrl; }} />
					</div>
				{/if}
				{#if frontAudioUrl}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="w-full" onclick={(e) => e.stopPropagation()} role="presentation">
						<audio controls src={frontAudioUrl} class="w-full rounded-lg h-8"></audio>
					</div>
				{/if}
			</div>
			<p class="shrink-0 text-center text-xs text-[var(--color-text-muted)] mt-2">Click to flip</p>
		</div>

		<!-- Back face -->
		<div class="absolute inset-0 flex flex-col rounded-xl border border-[var(--color-accent-500)]/30 bg-[var(--color-surface-800)] p-5 overflow-hidden"
		     style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);">
			<span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Back</span>
			<div class="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
				<p class="text-sm text-center text-[var(--color-text-primary)] leading-relaxed line-clamp-4">{backText}</p>
				{#if backImageUrl}
					<div class="flex items-center justify-center overflow-hidden" style="max-height: 100px; width: 100%;">
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<img src={backImageUrl} alt="Back"
							class="rounded-lg border border-[var(--color-surface-700)] cursor-zoom-in"
							style="max-width: 100%; max-height: 100px; object-fit: contain;"
							onclick={(e) => { e.stopPropagation(); zoomSrc = backImageUrl; }} />
					</div>
				{/if}
				{#if backAudioUrl}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="w-full" onclick={(e) => e.stopPropagation()} role="presentation">
						<audio controls src={backAudioUrl} class="w-full rounded-lg h-8"></audio>
					</div>
				{/if}
			</div>
			<p class="shrink-0 text-center text-xs text-[var(--color-text-muted)] mt-2">Click to flip back</p>
		</div>
	</button>
</div>
