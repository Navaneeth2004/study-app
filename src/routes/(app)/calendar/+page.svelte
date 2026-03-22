<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getLogsForRange, createLog, deleteLog,
		listGoals, createGoal, updateGoal, deleteGoal, toggleGoalActive,
		type LogData, type GoalData
	} from '$lib/calendar/calendarService';
	import {
		getCalendarDays, getStreakCount, getLongestStreak,
		getGoalStats, getHeatmapData, getWeeklyActivity, formatDate, parseDate
	} from '$lib/calendar/calendarUtils';
	import CalendarGrid from '$lib/calendar/components/CalendarGrid.svelte';
	import DayDetailPanel from '$lib/calendar/components/DayDetailPanel.svelte';
	import GoalCard from '$lib/calendar/components/GoalCard.svelte';
	import GoalFormModal from '$lib/calendar/components/GoalFormModal.svelte';
	import type { GoalFormData } from '$lib/calendar/components/GoalFormModal.svelte';
	import Heatmap from '$lib/calendar/components/Heatmap.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import type { CalendarDay, StudyLog, StudyGoal, MoodRating } from '$lib/calendar/calendarTypes';

	const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	const MOOD_EMOJI: Record<number, string> = { 1:'😔', 2:'😐', 3:'🙂', 4:'😊', 5:'🤩' };

	type Tab = 'calendar' | 'analytics' | 'goals';
	type Period = 'week' | 'month' | 'year';
	type BarMetric = 'days' | 'minutes';

	let activeTab = $state<Tab>('calendar');
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let allLogs = $state<StudyLog[]>([]);
	let goals = $state<StudyGoal[]>([]);
	let selectedDay = $state<CalendarDay | null>(null);
	let dayModalDirty = $state(false);
	let showDiscardDay = $state(false);
	let loading = $state(true);
	let error = $state('');
	let savingDay = $state(false);
	let analyticsPeriod = $state<Period>('month');
	let barMetric = $state<BarMetric>('days');

	// Goal modal
	let showGoalModal = $state(false);
	let editingGoal = $state<StudyGoal | null>(null);
	let savingGoal = $state(false);
	let goalError = $state('');

	const calendarDays = $derived(getCalendarDays(currentYear, currentMonth, allLogs));
	const streakCount = $derived(getStreakCount(allLogs));
	const longestStreak = $derived(getLongestStreak(allLogs));
	const totalLogged = $derived(allLogs.length);
	const heatmapData = $derived(getHeatmapData(allLogs));
	const goalStatsList = $derived(goals.map((g) => getGoalStats(g, allLogs)));
	const weeklyActivity = $derived(getWeeklyActivity(allLogs, 10));
	const barMax = $derived(() => {
		const vals = weeklyActivity.map((w) => barMetric === 'days' ? w.days : w.minutes);
		return Math.max(...vals, 1);
	});

	const periodLogs = $derived.by(() => {
		const today = new Date();
		let start: Date;
		if (analyticsPeriod === 'week') { start = new Date(today); start.setDate(today.getDate() - 6); }
		else if (analyticsPeriod === 'month') { start = new Date(today.getFullYear(), today.getMonth(), 1); }
		else { start = new Date(today.getFullYear(), 0, 1); }
		return allLogs.filter((l) => l.date >= formatDate(start));
	});

	const periodStats = $derived.by(() => {
		const logs = periodLogs;
		const totalDays = logs.length;
		const moodLogs = logs.filter((l) => l.mood !== null);
		const avgMood = moodLogs.length > 0 ? moodLogs.reduce((s, l) => s + (l.mood ?? 0), 0) / moodLogs.length : null;
		const totalMinutes = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
		const dowCount = [0,0,0,0,0,0,0];
		for (const log of logs) dowCount[parseDate(log.date).getDay()]++;
		const maxDow = dowCount.indexOf(Math.max(...dowCount));
		return { totalDays, avgMood, totalMinutes, mostActiveDay: totalDays > 0 ? DOW_LABELS[maxDow] : null };
	});

	onMount(async () => {
		loading = true;
		try {
			const year = new Date().getFullYear();
			const [logs, gs] = await Promise.all([
				getLogsForRange(`${year - 1}-01-01`, `${year + 1}-12-31`),
				listGoals()
			]);
			allLogs = logs; goals = gs;
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load calendar data.'; }
		finally { loading = false; }
	});

	function prevMonth() { if (currentMonth === 1) { currentYear--; currentMonth = 12; } else currentMonth--; }
	function nextMonth() { if (currentMonth === 12) { currentYear++; currentMonth = 1; } else currentMonth++; }
	function goToday() { const n = new Date(); currentYear = n.getFullYear(); currentMonth = n.getMonth() + 1; }

	function handleDayClick(day: CalendarDay) { dayModalDirty = false; selectedDay = day; }
	function attemptCloseDay() { if (dayModalDirty) showDiscardDay = true; else selectedDay = null; }
	function closeDay() { dayModalDirty = false; selectedDay = null; }

	async function handleDaySave(data: LogData & { mood: MoodRating | null }) {
		if (!selectedDay || selectedDay.isFuture) return;
		savingDay = true;
		try {
			const saved = await createLog(selectedDay.date, data);
			allLogs = [...allLogs.filter((l) => l.date !== selectedDay!.date), saved]
				.sort((a, b) => a.date.localeCompare(b.date));
		} finally { savingDay = false; }
	}

	async function handleDayDelete() {
		if (!selectedDay?.log) return;
		savingDay = true;
		try {
			await deleteLog(selectedDay.log.id);
			allLogs = allLogs.filter((l) => l.id !== selectedDay!.log!.id);
		} finally { savingDay = false; }
	}

	// Goal modal actions
	function openNewGoalModal() {
		editingGoal = null;
		goalError = '';
		showGoalModal = true;
	}

	function openEditGoalModal(goal: StudyGoal) {
		editingGoal = goal;
		goalError = '';
		showGoalModal = true;
	}

	async function handleGoalSave(data: GoalFormData) {
		savingGoal = true;
		goalError = '';
		try {
			const payload: GoalData = {
				title: data.title,
				type: data.type,
				targetDays: data.targetDays,
				targetDaysOfWeek: data.targetDaysOfWeek,
				targetMinutes: data.targetMinutes,
				startDate: data.startDate,
				endDate: data.endDate
			};
			if (editingGoal) {
				const updated = await updateGoal(editingGoal.id, payload);
				goals = goals.map((g) => (g.id === editingGoal!.id ? updated : g));
			} else {
				goals = [...goals, await createGoal(payload)];
			}
			showGoalModal = false;
		} catch (e) {
			goalError = e instanceof Error ? e.message : 'Could not save goal.';
			throw e; // re-throw so modal stays open
		} finally {
			savingGoal = false;
		}
	}

	async function handleGoalDelete(id: string) {
		try { await deleteGoal(id); goals = goals.filter((g) => g.id !== id); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not delete goal.'; }
	}

	async function handleToggleGoalActive(id: string, isActive: boolean) {
		try { await toggleGoalActive(id, isActive); goals = goals.map((g) => (g.id === id ? { ...g, isActive } : g)); }
		catch (e) { error = e instanceof Error ? e.message : 'Could not update goal.'; }
	}
</script>

<svelte:head>
	<title>Calendar — StudyApp</title>
</svelte:head>

<!-- Day detail modal -->
{#if selectedDay && !selectedDay.isPadding}
	<UnsavedChangesModal
		isOpen={showDiscardDay}
		zClass="z-[60]"
		saving={false}
		onSave={async () => { showDiscardDay = false; }}
		onLeave={() => { showDiscardDay = false; selectedDay = null; }}
		onStay={() => (showDiscardDay = false)}
	/>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={attemptCloseDay}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] shadow-2xl"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Study Log</span>
				<button onclick={attemptCloseDay} aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="p-5">
				<DayDetailPanel
					day={selectedDay}
					saving={savingDay}
					onSave={handleDaySave}
					onDelete={handleDayDelete}
					onClose={closeDay}
					onDirtyChange={(d) => (dayModalDirty = d)}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Goal form modal -->
<GoalFormModal
	isOpen={showGoalModal}
	editingGoal={editingGoal}
	saving={savingGoal}
	error={goalError}
	onSave={handleGoalSave}
	onClose={() => (showGoalModal = false)}
/>

<div class="flex flex-col gap-6 max-w-2xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Study Calendar</h1>
		<p class="text-[var(--color-text-secondary)]">Track your study days and build habits.</p>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	{#if loading}
		<div class="flex flex-col gap-3">
			{#each Array(3) as _}
				<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>
			{/each}
		</div>
	{:else}
		<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
			{#each (['calendar', 'analytics', 'goals'] as Tab[]) as tab}
				<button onclick={() => (activeTab = tab)}
					class="px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors
					       {activeTab === tab
						? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
						: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
					{tab}
				</button>
			{/each}
		</div>

		<!-- ── CALENDAR ─────────────────────────────────────────────────────── -->
		{#if activeTab === 'calendar'}
			<div class="flex flex-col gap-5">
				<div class="flex items-center gap-4 rounded-xl border border-[var(--color-surface-700)]
				            bg-[var(--color-surface-900)] px-5 py-3">
					<span class="text-sm text-[var(--color-text-secondary)]">
						🔥 Current streak: <strong class="text-[var(--color-text-primary)]">{streakCount}</strong> {streakCount === 1 ? 'day' : 'days'}
					</span>
					<span class="text-xs text-[var(--color-text-muted)]">Best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}</span>
				</div>
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<button onclick={prevMonth} aria-label="Previous month"
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
						</button>
						<span class="text-base font-semibold text-[var(--color-text-primary)] min-w-36 text-center">
							{MONTH_NAMES[currentMonth - 1]} {currentYear}
						</span>
						<button onclick={nextMonth} aria-label="Next month"
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					</div>
					<button onclick={goToday}
						class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Today
					</button>
				</div>
				<CalendarGrid year={currentYear} month={currentMonth} days={calendarDays}
					selectedDate={selectedDay?.date ?? null} onDayClick={handleDayClick} />
			</div>

		<!-- ── ANALYTICS ────────────────────────────────────────────────────── -->
		{:else if activeTab === 'analytics'}
			<div class="flex flex-col gap-6">
				<div class="grid grid-cols-3 gap-3">
					<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
						<span class="text-xs text-[var(--color-text-muted)]">Current Streak</span>
						<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{streakCount} 🔥</span>
					</div>
					<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
						<span class="text-xs text-[var(--color-text-muted)]">Longest Streak</span>
						<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{longestStreak} 🏆</span>
					</div>
					<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3">
						<span class="text-xs text-[var(--color-text-muted)]">Total Days</span>
						<span class="text-2xl font-semibold text-[var(--color-text-primary)]">{totalLogged}</span>
					</div>
				</div>

				<!-- Weekly bar chart -->
				<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Weekly Activity</span>
						<div class="flex gap-1">
							<button onclick={() => (barMetric = 'days')}
								class="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors
								       {barMetric === 'days' ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
								Days
							</button>
							<button onclick={() => (barMetric = 'minutes')}
								class="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors
								       {barMetric === 'minutes' ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
								Minutes
							</button>
						</div>
					</div>
					{#if totalLogged === 0}
						<p class="text-sm text-[var(--color-text-muted)] py-4 text-center">No activity yet.</p>
					{:else}
						<div class="flex items-end gap-1.5" style="height: 96px;">
							{#each weeklyActivity as week}
								{@const val = barMetric === 'days' ? week.days : week.minutes}
								{@const heightPct = barMax() > 0 ? (val / barMax()) * 100 : 0}
								<div class="flex flex-1 flex-col items-center gap-1" style="height: 100%;">
									<div class="flex w-full flex-col justify-end" style="height: calc(100% - 20px);">
										{#if val > 0}
											<div class="w-full rounded-t-md transition-all"
											     style="height: {heightPct}%; background: var(--color-accent-500); opacity: {0.4 + heightPct / 100 * 0.6};"
											     title="{week.label}: {val} {barMetric}">
											</div>
										{:else}
											<div class="w-full rounded-t-md" style="height: 2px; background: var(--color-surface-700);"></div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<div class="flex gap-1.5">
							{#each weeklyActivity as week, i}
								<div class="flex-1 text-center text-[9px] text-[var(--color-text-muted)] truncate">
									{i % 2 === 0 ? week.label : ''}
								</div>
							{/each}
						</div>
						<p class="text-xs text-[var(--color-text-muted)]">
							{barMetric === 'days' ? 'Days studied per week (max 7)' : 'Minutes studied per week'}
						</p>
					{/if}
				</div>

				<!-- Heatmap -->
				<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Activity — past 52 weeks</span>
					<Heatmap data={heatmapData} />
				</div>

				<!-- Period summary -->
				<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Summary</span>
						<div class="flex gap-1">
							{#each (['week', 'month', 'year'] as Period[]) as p}
								<button onclick={() => (analyticsPeriod = p)}
									class="rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors
									       {analyticsPeriod === p ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
									{p}
								</button>
							{/each}
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div class="flex flex-col gap-0.5">
							<span class="text-xs text-[var(--color-text-muted)]">Days studied</span>
							<span class="text-lg font-semibold text-[var(--color-text-primary)]">{periodStats.totalDays}</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-xs text-[var(--color-text-muted)]">Avg mood</span>
							<span class="text-lg font-semibold text-[var(--color-text-primary)]">
								{#if periodStats.avgMood !== null}
									{MOOD_EMOJI[Math.round(periodStats.avgMood)]}
									<span class="text-sm text-[var(--color-text-secondary)]">{periodStats.avgMood.toFixed(1)}</span>
								{:else}—{/if}
							</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-xs text-[var(--color-text-muted)]">Minutes studied</span>
							<span class="text-lg font-semibold text-[var(--color-text-primary)]">
								{periodStats.totalMinutes > 0 ? periodStats.totalMinutes : '—'}
							</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-xs text-[var(--color-text-muted)]">Most active</span>
							<span class="text-lg font-semibold text-[var(--color-text-primary)]">{periodStats.mostActiveDay ?? '—'}</span>
						</div>
					</div>
				</div>
			</div>

		<!-- ── GOALS ─────────────────────────────────────────────────────────── -->
		{:else}
			<div class="flex flex-col gap-5">
				<div class="flex items-center justify-between gap-4">
					<p class="text-sm text-[var(--color-text-secondary)]">
						A day counts toward a goal when you have a study log meeting the time target (if set).
					</p>
					<button
						onclick={openNewGoalModal}
						class="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent-500)]
						       px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						New Goal
					</button>
				</div>

				{#if goals.length === 0}
					<div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed
					            border-[var(--color-surface-600)] py-12 text-center">
						<p class="text-sm font-medium text-[var(--color-text-secondary)]">No goals yet</p>
						<p class="text-sm text-[var(--color-text-muted)]">Create a goal to track your study habits.</p>
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each goals as goal, i (goal.id)}
							<GoalCard
								{goal}
								stats={goalStatsList[i]}
								onEdit={openEditGoalModal}
								onDelete={handleGoalDelete}
								onToggleActive={handleToggleGoalActive}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
