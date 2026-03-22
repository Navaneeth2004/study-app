<script lang="ts">
	interface Props {
		times: string[];
		onChange: (times: string[]) => void;
		maxTimes?: number;
	}

	let { times, onChange, maxTimes = 5 }: Props = $props();

	function updateTime(index: number, value: string) {
		const next = [...times];
		next[index] = value;
		onChange(next);
	}

	function addTime() {
		if (times.length < maxTimes) onChange([...times, '08:00']);
	}

	function removeTime(index: number) {
		onChange(times.filter((_, i) => i !== index));
	}
</script>

<div class="flex flex-col gap-2">
	{#each times as time, index}
		<div class="flex items-center gap-2">
			<input
				type="time"
				value={time}
				oninput={(e) => updateTime(index, (e.target as HTMLInputElement).value)}
				class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-sm text-[var(--color-text-primary)]
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
			/>
			{#if times.length > 1}
				<button
					onclick={() => removeTime(index)}
					aria-label="Remove time {index + 1}"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			{/if}
		</div>
	{/each}
	{#if times.length < maxTimes}
		<button
			onclick={addTime}
			class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
		>
			+ Add time
		</button>
	{/if}
</div>
