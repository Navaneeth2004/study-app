<script lang="ts">
	import type { SubtitleBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: SubtitleBlock['data'];
		onUpdate: (data: SubtitleBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();
</script>

<input
	type="text"
	value={data.text}
	oninput={(e) => onUpdate({ text: (e.target as HTMLInputElement).value })}
	placeholder="Subtitle text…"
	class="w-full bg-transparent text-lg font-medium text-[var(--color-text-primary)]
	       placeholder:text-[var(--color-text-muted)] focus:outline-none"
/>