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

	const MONTH_NAMES = [
		'January','February','March','April','May','June',
		'July','August','September','October','November','December'
	];
	const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
	const MOOD_EMOJI: Record<number, string> = { 1:'😔', 2:'😐', 3:'🙂', 4:'😊', 5:'🤩' };
</script>

<div class="flex flex-col gap-1">
	<!-- Day headers -->
	<div class="grid grid-cols-7 gap-1">
		{#each DAY_HEADERS as h}
			<div class="text-center text-xs font-medium text-[var(--color-text-muted)] py-1">{h}</div>
		{/each}
	</div>

	<!-- Day cells — aspect-square makes them square on all screen sizes -->
	<div class="grid grid-cols-7 gap-1">
		{#each days as day (day.date)}
			<button
				onclick={() => !day.isFuture && onDayClick(day)}
				class="relative flex flex-col items-center justify-center rounded-lg
				       aspect-square transition-colors text-xs
				       {day.isPadding
					? 'opacity-30 cursor-default'
					: day.isFuture
					? 'opacity-40 cursor-default'
					: 'cursor-pointer hover:bg-[var(--color-surface-800)]'}
				       {day.isToday ? 'ring-1 ring-[var(--color-accent-500)]' : ''}
				       {selectedDate === day.date && !day.isPadding ? 'bg-[var(--color-surface-800)]' : ''}
				       {day.log && !day.isPadding ? 'bg-[var(--color-accent-500)]/8' : ''}"
				disabled={day.isFuture || day.isPadding}
				aria-label={day.date}
			>
				<span class="font-medium leading-none
				       {day.isToday ? 'text-[var(--color-accent-400)]' : 'text-[var(--color-text-secondary)]'}">
					{parseInt(day.date.slice(8))}
				</span>
				{#if day.log && !day.isPadding}
					{#if day.log.mood}
						<span class="text-[9px] leading-none mt-0.5">{MOOD_EMOJI[day.log.mood]}</span>
					{:else}
						<span class="mt-0.5 h-1 w-1 rounded-full bg-[var(--color-accent-500)]"></span>
					{/if}
				{/if}
			</button>
		{/each}
	</div>
</div>
