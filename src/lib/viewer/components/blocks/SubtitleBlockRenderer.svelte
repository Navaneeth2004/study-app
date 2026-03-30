<script lang="ts">
	import type { SubtitleBlock } from '$lib/creator/contentTypes';
	interface Props { data: SubtitleBlock['data'] }
	let { data }: Props = $props();
</script>
<h2 class="font-display text-xl text-[var(--color-text-secondary)]">{data.text}</h2>
