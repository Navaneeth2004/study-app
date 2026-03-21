<script lang="ts">
	import type { ParagraphBlock } from '$lib/creator/contentTypes';
	interface Props { data: ParagraphBlock['data'] }
	let { data }: Props = $props();

	const rendered = $derived(
		data.html
			.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>')
			.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>')
			.replace(/<l>(.*?)<\/l>/g, '<u>$1</u>')
	);
</script>
<p class="text-sm leading-relaxed text-[var(--color-text-primary)]">{@html rendered}</p>