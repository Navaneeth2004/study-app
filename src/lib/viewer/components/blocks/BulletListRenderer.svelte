<script lang="ts">
	import type { BulletListBlock } from '$lib/creator/contentTypes';
	interface Props { data: BulletListBlock['data'] }
	let { data }: Props = $props();

	function renderItem(text: string): string {
		return text
			.replace(/<b>([\s\S]*?)<\/b>/g, '<strong>$1</strong>')
			.replace(/<i>([\s\S]*?)<\/i>/g, '<em>$1</em>')
			.replace(/<l>([\s\S]*?)<\/l>/g, '<u>$1</u>');
	}
</script>
<ul class="flex flex-col gap-1.5">
	{#each data.items as item}
		<li class="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
			<span class="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-500)]"></span>
			<span>{@html renderItem(item)}</span>
		</li>
	{/each}
</ul>
