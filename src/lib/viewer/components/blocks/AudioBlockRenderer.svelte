<script lang="ts">
	import type { AudioBlock } from '$lib/creator/contentTypes';
	interface Props { data: AudioBlock['data'] }
	let { data }: Props = $props();
</script>
{#if data.url}
	<div class="flex flex-col gap-2">
		{#if data.label}
			<p class="text-sm font-medium text-[var(--color-text-secondary)]">{data.label}</p>
		{/if}
		<audio controls src={data.url} class="w-full rounded-lg"></audio>
	</div>
{/if}