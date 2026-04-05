<script lang="ts">
	import type { ParagraphBlock } from '$lib/creator/contentTypes';
	interface Props { data: ParagraphBlock['data'] }
	let { data }: Props = $props();
	const rendered = $derived(
		data.html
			.replace(/<b>([\s\S]*?)<\/b>/g, '<strong>$1</strong>')
			.replace(/<i>([\s\S]*?)<\/i>/g, '<em>$1</em>')
			.replace(/<l>([\s\S]*?)<\/l>/g, '<u>$1</u>')
			.replace(/\n/g, '<br>')
	);
</script>
<p class="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">{@html rendered}</p>
