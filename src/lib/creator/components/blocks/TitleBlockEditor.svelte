<script lang="ts">
	import type { TitleBlock } from '$lib/creator/contentTypes';

	interface Props {
		data: TitleBlock['data'];
		onUpdate: (data: TitleBlock['data']) => void;
	}

	let { data, onUpdate }: Props = $props();
</script>

<input
	type="text"
	value={data.text}
	oninput={(e) => onUpdate({ text: (e.target as HTMLInputElement).value })}
	placeholder="Title text…"
	class="w-full bg-transparent text-2xl font-display font-normal text-[var(--color-text-primary)]
	       placeholder:text-[var(--color-text-muted)] focus:outline-none"
/>