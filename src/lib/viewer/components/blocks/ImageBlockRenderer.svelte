<script lang="ts">
	import type { ImageBlock } from '$lib/creator/contentTypes';
	import ImageZoomModal from '$lib/shared/components/ImageZoomModal.svelte';

	interface Props { data: ImageBlock['data'] }
	let { data }: Props = $props();

	let zoomOpen = $state(false);
</script>

{#if data.url}
	<figure class="flex flex-col gap-2">
		<!-- Clicking the image opens the zoom modal -->
		<button
			onclick={() => (zoomOpen = true)}
			class="relative group rounded-xl overflow-hidden border border-[var(--color-surface-700)] cursor-zoom-in"
			aria-label="Click to zoom image"
		>
			<img src={data.url} alt={data.caption || 'Image'} class="w-full object-cover" />
			<!-- Hover hint -->
			<div class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
				<div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
						<line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
					</svg>
					Zoom
				</div>
			</div>
		</button>
		{#if data.caption}
			<figcaption class="text-center text-xs text-[var(--color-text-muted)]">{data.caption}</figcaption>
		{/if}
	</figure>

	{#if zoomOpen}
		<ImageZoomModal src={data.url} alt={data.caption || 'Image'} onClose={() => (zoomOpen = false)} />
	{/if}
{/if}
