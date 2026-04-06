<script lang="ts">
	interface QuoteData { text: string; attribution: string }
	interface Props { data: QuoteData }
	let { data }: Props = $props();
</script>

<blockquote class="border-l-4 border-[var(--color-accent-500)] pl-4 py-1 flex flex-col gap-1">
	<p class="text-base italic text-[var(--color-text-primary)] leading-relaxed">{data.text}</p>
	{#if data.attribution}
		<footer class="text-sm text-[var(--color-text-muted)]">— {data.attribution}</footer>
	{/if}
</blockquote>
