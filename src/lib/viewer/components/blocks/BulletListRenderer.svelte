<script lang="ts">
	import type { BulletListBlock } from '$lib/creator/contentTypes';
	interface Props { data: BulletListBlock['data'] }
	let { data }: Props = $props();
</script>
<ul class="flex flex-col gap-1.5">
	{#each data.items as item}
		<li class="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
			<span class="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-500)]"></span>
			{item}
		</li>
	{/each}
</ul>