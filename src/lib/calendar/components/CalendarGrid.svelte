<script lang="ts">
	import type { CalendarDay } from '$lib/calendar/calendarTypes';

	interface Props {
		year: number;
		month: number;
		days: CalendarDay[];
		selectedDate: string | null;
		onDayClick: (day: CalendarDay) => void;
	}

	let { year, month, days, selectedDate, onDayClick }: Props = $props();

	const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
	const MOOD_EMOJI: Record<number, string> = { 1:'😔', 2:'😐', 3:'🙂', 4:'😊', 5:'🤩' };
</script>

<div class="flex flex-col gap-0.5 w-full">
	<div class="grid grid-cols-7">
		{#each DAY_HEADERS as h}
			<div class="py-1.5 text-center text-xs font-medium text-[var(--color-text-muted)]">{h}</div>
		{/each}
	</div>

	<div class="grid grid-cols-7 gap-1">
		{#each days as day (day.date)}
			<button
				onclick={() => !day.isFuture && !day.isPadding && onDayClick(day)}
				disabled={day.isFuture || day.isPadding}
				aria-label="{day.date}{day.log ? ' — logged' : ''}"
				class="relative flex flex-col items-center justify-center rounded-lg
				       aspect-square transition-colors
				       {day.isPadding ? 'opacity-0 cursor-default pointer-events-none' : ''}
				       {!day.isPadding && !day.isFuture ? 'cursor-pointer hover:bg-[var(--color-surface-800)]/60' : ''}
				       {day.isFuture && !day.isPadding ? 'opacity-30 cursor-default' : ''}
				       {selectedDate === day.date && !day.isPadding ? 'bg-[var(--color-surface-800)]/60' : ''}
				       {day.log && !day.isPadding ? 'bg-[var(--color-accent-500)]/10' : ''}"
			>
				<!-- Number — today gets a small tight border around just the number -->
				<span
					class="text-xs font-medium leading-none px-1 py-0.5
					       {day.isToday && !day.isPadding
						? 'rounded border border-[var(--color-accent-500)]/70 text-[var(--color-accent-400)]'
						: 'text-[var(--color-text-secondary)]'}"
				>
					{day.isPadding ? '' : parseInt(day.date.slice(8))}
				</span>

				{#if day.log && !day.isPadding}
					{#if day.log.mood}
						<span class="text-[10px] leading-none mt-0.5">{MOOD_EMOJI[day.log.mood]}</span>
					{:else}
						<span class="mt-1 h-1 w-1 rounded-full bg-[var(--color-accent-500)]"></span>
					{/if}
				{/if}
			</button>
		{/each}
	</div>
</div>
