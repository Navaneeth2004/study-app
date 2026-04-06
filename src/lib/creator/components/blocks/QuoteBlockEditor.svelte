<script lang="ts">
	interface QuoteData { text: string; attribution: string }
	interface Props {
		data: QuoteData;
		onUpdate: (data: QuoteData) => void;
	}
	let { data, onUpdate }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<textarea
		rows="3"
		value={data.text}
		oninput={(e) => onUpdate({ ...data, text: (e.target as HTMLTextAreaElement).value })}
		placeholder="Quote text…"
		class="w-full resize-none bg-transparent text-base italic text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
	></textarea>
	<input
		type="text"
		value={data.attribution}
		oninput={(e) => onUpdate({ ...data, attribution: (e.target as HTMLInputElement).value })}
		placeholder="— Attribution (optional)"
		class="w-full bg-transparent text-sm text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
	/>
</div>
