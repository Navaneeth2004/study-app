<script lang="ts">
	import type { ImageBlock } from '$lib/creator/contentTypes';
	interface Props { data: ImageBlock['data'] }
	let { data }: Props = $props();
</script>
{#if data.url}
	<figure class="flex flex-col gap-2">
		<img src={data.url} alt={data.caption || 'Image'} class="w-full rounded-xl border border-[var(--color-surface-700)] object-cover" />
		{#if data.caption}
			<figcaption class="text-center text-xs text-[var(--color-text-muted)]">{data.caption}</figcaption>
		{/if}
	</figure>
{/if}