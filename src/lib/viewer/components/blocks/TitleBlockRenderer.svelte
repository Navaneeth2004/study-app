<script lang="ts">
	import type { TitleBlock } from '$lib/creator/contentTypes';
	interface Props { data: TitleBlock['data'] }
	let { data }: Props = $props();
</script>
<h1 class="font-display text-3xl text-[var(--color-text-primary)]">{data.text}</h1>