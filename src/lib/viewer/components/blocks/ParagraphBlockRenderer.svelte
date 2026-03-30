<script lang="ts">
	import type { ParagraphBlock } from '$lib/creator/contentTypes';
	interface Props { data: ParagraphBlock['data'] }
	let { data }: Props = $props();

	const rendered = $derived(
		data.html
			.replace(/<b>(.*?)<\/b>/gs, '<strong>$1</strong>')
			.replace(/<i>(.*?)<\/i>/gs, '<em>$1</em>')
			.replace(/<l>(.*?)<\/l>/gs, '<u>$1</u>')
			.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, (_match, href, text) => {
				const display = text.length > 40 ? text.slice(0, 37) + '…' : text;
				return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:var(--color-accent-400);text-decoration:underline;">${display}</a>`;
			})
			.replace(/\n/g, '<br />')
	);
</script>
<p class="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">{@html rendered}</p>
