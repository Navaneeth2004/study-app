<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getLogsForRange, createLog, updateLog, deleteLog,
		listGoals, createGoal, updateGoal, deleteGoal, toggleGoalActive,
		type LogData, type GoalData
	} from '$lib/calendar/calendarService';
	import {
		getCalendarDays, getStreakCount, getLongestStreak,
		getGoalStats, getHeatmapData, formatDate, parseDate
	} from '$lib/calendar/calendarUtils';
	import CalendarGrid from '$lib/calendar/components/CalendarGrid.svelte';
	import DayDetailPanel from '$lib/calendar/components/DayDetailPanel.svelte';
	import GoalCard from '$lib/calendar/components/GoalCard.svelte';
	import Heatmap from '$lib/calendar/components/Heatmap.svelte';
	import type { CalendarDay, StudyLog, StudyGoal, GoalType, MoodRating } from '$lib/calendar/calendarTypes';

	const MONTH_NAMES = [
		'January','February','March','April','May','June',
		'July','August','September','October','November','December'
	];
	const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	const MOOD_EMOJI: Record<number, string> = { 1:'😔', 2:'😐', 3:'🙂', 4:'😊', 5:'🤩' };

	type Tab = 'calendar' | 'analytics' | 'goals';
	type Period = 'week' | 'month' | 'year';

	let activeTab = $state<Tab>('calendar');
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let allLogs = $state<StudyLog[]>([]);
	let goals = $state<StudyGoal[]>([]);
	let selectedDay = $state<CalendarDay | null>(null);
	let loading = $state(true);
	let error = $state('');
	let savingDay = $state(false);
	let analyticsPeriod = $state<Period>('month');

	// Goal form state
	let showGoalForm = $state(false);
	let editingGoalId = $state<string | null>(null);
	let gTitle = $state('');
	let gType = $state<GoalType>('daily');
	let gTargetMinutes = $state('');
	let gDaysOfWeek = $state<number[]>([]);
	let gCustomDates = $state<string[]>([]);
	let gCustomDateInput = $state('');
	let gStartDate = $state(formatDate(new Date()));
	let gHasEndDate = $state(false);
	let gEndDate = $state('');
	let savingGoal = $state(false);
	let goalError = $state('');

	const calendarDays = $derived(getCalendarDays(currentYear, currentMonth, allLogs));
	const streakCount = $derived(getStreakCount(allLogs));
	const longestStreak = $derived(getLongestStreak(allLogs));
	const totalLogged = $derived(allLogs.length);
	const heatmapData = $derived(getHeatmapData(allLogs));
	const goalStatsList = $derived(goals.map((g) => getGoalStats(g, allLogs)));

	const periodLogs = $derived.by(() => {
		const today = new Date();
		let start: Date;
		if (analyticsPeriod === 'week') {
			start = new Date(today);
			start.setDate(today.getDate() - 6);
		} else if (analyticsPeriod === 'month') {
			start = new Date(today.getFullYear(), today.getMonth(), 1);
		} else {
			start = new Date(today.getFullYear(), 0, 1);
		}
		return allLogs.filter((l) => l.date >= formatDate(start));
	});

	const periodStats = $derived.by(() => {
		const logs = periodLogs;
		const totalDays = logs.length;
		const moodLogs = logs.filter((l) => l.mood !== null);
		const avgMood = moodLogs.length > 0
			? moodLogs.reduce((s, l) => s + (l.mood ?? 0), 0) / moodLogs.length
			: null;
		const totalMinutes = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
		const dowCount = [0, 0, 0, 0, 0, 0, 0];
		for (const log of logs) dowCount[parseDate(log.date).getDay()]++;
		const maxDow = dowCount.indexOf(Math.max(...dowCount));
		const mostActiveDay = totalDays > 0 ? DOW_LABELS[maxDow] : null;
		return { totalDays, avgMood, totalMinutes, mostActiveDay };
	});

	onMount(async () => {
		loading = true;
		try {
			const year = new Date().getFullYear();
			const [logs, gs] = await Promise.all([
				getLogsForRange(`${year - 1}-01-01`, `${year + 1}-12-31`),
				listGoals()
			]);
			allLogs = logs;
			goals = gs;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load calendar data.';
		} finally {
			loading = false;
		}
	});

	function prevMonth() {
		if (currentMonth === 1) { currentYear--; currentMonth = 12; } else currentMonth--;
		selectedDay = null;
	}
	function nextMonth() {
		if (currentMonth === 12) { currentYear++; currentMonth = 1; } else currentMonth++;
		selectedDay = null;
	}
	function goToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth() + 1;
		selectedDay = null;
	}

	function handleDayClick(day: CalendarDay) { selectedDay = day; }

	async function handleDaySave(data: LogData & { mood: MoodRating | null }) {
		if (!selectedDay || selectedDay.isFuture) return;
		savingDay = true;
		try {
			const saved = await createLog(selectedDay.date, data);
			allLogs = [...allLogs.filter((l) => l.date !== selectedDay!.date), saved]
				.sort((a, b) => a.date.localeCompare(b.date));
			const updated = calendarDays.find((d) => d.date === selectedDay!.date);
			if (updated) selectedDay = { ...updated, log: saved };
		} finally { savingDay = false; }
	}

	async function handleDayDelete() {
		if (!selectedDay?.log) return;
		savingDay = true;
		try {
			await deleteLog(selectedDay.log.id);
			allLogs = allLogs.filter((l) => l.id !== selectedDay!.log!.id);
			const updated = calendarDays.find((d) => d.date === selectedDay!.date);
			if (updated) selectedDay = { ...updated, log: null };
		} finally { savingDay = false; }
	}

	function openNewGoalForm() {
		editingGoalId = null;
		gTitle = ''; gType = 'daily'; gTargetMinutes = '';
		gDaysOfWeek = []; gCustomDates = []; gCustomDateInput = '';
		gStartDate = formatDate(new Date()); gHasEndDate = false; gEndDate = '';
		goalError = ''; showGoalForm = true;
	}

	function openEditGoalForm(goal: StudyGoal) {
		editingGoalId = goal.id;
		gTitle = goal.title; gType = goal.type;
		gTargetMinutes = goal.targetMinutes ? String(goal.targetMinutes) : '';
		gDaysOfWeek = goal.targetDaysOfWeek ?? [];
		gCustomDates = goal.targetDays ?? []; gCustomDateInput = '';
		gStartDate = goal.startDate; gHasEndDate = !!goal.endDate;
		gEndDate = goal.endDate ?? ''; goalError = ''; showGoalForm = true;
	}

	function addCustomDate() {
		const d = gCustomDateInput.trim();
		if (d && !gCustomDates.includes(d)) gCustomDates = [...gCustomDates, d].sort();
		gCustomDateInput = '';
	}

	function removeCustomDate(d: string) { gCustomDates = gCustomDates.filter((x) => x !== d); }

	function toggleDow(d: number) {
		gDaysOfWeek = gDaysOfWeek.includes(d)
			? gDaysOfWeek.filter((x) => x !== d)
			: [...gDaysOfWeek, d];
	}

	async function handleGoalSave() {
		if (!gTitle.trim()) { goalError = 'Title is required.'; return; }
		if (gType === 'weekly' && gDaysOfWeek.length === 0) { goalError = 'Select at least one day.'; return; }
		if (gType === 'custom' && gCustomDates.length === 0) { goalError = 'Add at least one date.'; return; }
		savingGoal = true; goalError = '';
		try {
			const data: GoalData = {
				title: gTitle.trim(), type: gType,
				targetDays: gType === 'custom' ? gCustomDates : null,
				targetDaysOfWeek: gType === 'weekly' ? gDaysOfWeek : null,
				targetMinutes: gTargetMinutes ? parseInt(gTargetMinutes) : null,
				startDate: gStartDate,
				endDate: gHasEndDate && gEndDate ? gEndDate : null
			};
			if (editingGoalId) {
				const updated = await updateGoal(editingGoalId, data);
				goals = goals.map((g) => (g.id === editingGoalId ? updated : g));
			} else {
				goals = [...goals, await createGoal(data)];
			}
			showGoalForm = false;
		} catch (e) {
			goalError = e instanceof Error ? e.message : 'Could not save goal.';
		} finally { savingGoal = false; }
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
		<!-- Tabs -->
		<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
			{#each (['calendar', 'analytics', 'goals'] as Tab[]) as tab}
				<button
					onclick={() => (activeTab = tab)}
					class="px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors
					       {activeTab === tab
						? 'border-[var(--color-accent-500)] text-[var(--color-accent-400)]'
						: 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}"
				>
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
					<span class="text-xs text-[var(--color-text-muted)]">
						Best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
					</span>
				</div>

				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<button onclick={prevMonth}
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
							aria-label="Previous month">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
						</button>
						<span class="text-base font-semibold text-[var(--color-text-primary)] min-w-36 text-center">
							{MONTH_NAMES[currentMonth - 1]} {currentYear}
						</span>
						<button onclick={nextMonth}
							class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
							       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
							aria-label="Next month">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					</div>
					<button onclick={goToday}
						class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Today
					</button>
				</div>

				<CalendarGrid
					year={currentYear}
					month={currentMonth}
					days={calendarDays}
					selectedDate={selectedDay?.date ?? null}
					onDayClick={handleDayClick}
				/>

				{#if selectedDay && !selectedDay.isPadding}
					<DayDetailPanel
						day={selectedDay}
						saving={savingDay}
						onSave={handleDaySave}
						onDelete={handleDayDelete}
						onClose={() => (selectedDay = null)}
					/>
				{/if}
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

				<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Activity — past 52 weeks</span>
					<Heatmap data={heatmapData} />
				</div>

				<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Summary</span>
						<div class="flex gap-1">
							{#each (['week', 'month', 'year'] as Period[]) as p}
								<button
									onclick={() => (analyticsPeriod = p)}
									class="rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors
									       {analyticsPeriod === p
										? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
										: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}"
								>
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
						A day counts toward a goal if you log any study activity.
					</p>
					{#if !showGoalForm}
						<button
							onclick={openNewGoalForm}
							class="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent-500)]
							       px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							New Goal
						</button>
					{/if}
				</div>

				{#if showGoalForm}
					<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-accent-500)]/30 bg-[var(--color-surface-900)] p-5">
						<h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">
							{editingGoalId ? 'Edit Goal' : 'New Goal'}
						</h3>

						<!-- Title -->
						<div class="flex flex-col gap-1.5">
							<label for="goal-title" class="text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
							<input
								id="goal-title"
								type="text"
								bind:value={gTitle}
								placeholder="e.g. Study 1 hour daily"
								class="w-full rounded-xl border border-[var(--color-surface-600)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm
								       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
								       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
							/>
						</div>

						<!-- Type — span instead of label (no associated control) -->
						<div class="flex flex-col gap-1.5">
							<span class="text-xs font-medium text-[var(--color-text-secondary)]">Type</span>
							<div class="flex gap-2">
								{#each (['daily', 'weekly', 'custom'] as GoalType[]) as t}
									<button
										onclick={() => (gType = t)}
										class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
										       {gType === t
											? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
											: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
									>
										{t}
									</button>
								{/each}
							</div>
						</div>

						<!-- Target minutes -->
						{#if gType === 'daily' || gType === 'weekly'}
							<div class="flex flex-col gap-1.5">
								<label for="goal-minutes" class="text-xs font-medium text-[var(--color-text-secondary)]">Target minutes (optional)</label>
								<input
									id="goal-minutes"
									type="number"
									bind:value={gTargetMinutes}
									min={1}
									placeholder="e.g. 60"
									class="w-28 rounded-xl border border-[var(--color-surface-600)]
									       bg-[var(--color-surface-800)] px-3 py-2 text-sm
									       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
									       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
								/>
							</div>
						{/if}

						<!-- Days of week — span (buttons, not a single control) -->
						{#if gType === 'weekly'}
							<div class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-[var(--color-text-secondary)]">Days of the week</span>
								<div class="flex flex-wrap gap-2">
									{#each DOW_LABELS as dow, i}
										<button
											onclick={() => toggleDow(i)}
											class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
											       {gDaysOfWeek.includes(i)
												? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
												: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
										>
											{dow}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Custom dates — span (date picker + button) -->
						{#if gType === 'custom'}
							<div class="flex flex-col gap-2">
								<span class="text-xs font-medium text-[var(--color-text-secondary)]">Target dates</span>
								<div class="flex gap-2">
									<input
										type="date"
										bind:value={gCustomDateInput}
										class="rounded-xl border border-[var(--color-surface-600)]
										       bg-[var(--color-surface-800)] px-3 py-2 text-sm
										       text-[var(--color-text-primary)]
										       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
									/>
									<button
										onclick={addCustomDate}
										disabled={!gCustomDateInput}
										class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
										       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
										       disabled:opacity-40 transition-colors"
									>
										Add
									</button>
								</div>
								{#if gCustomDates.length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each gCustomDates as d}
											<span class="flex items-center gap-1 rounded-lg bg-[var(--color-surface-800)]
											             border border-[var(--color-surface-600)] px-2 py-1 text-xs
											             text-[var(--color-text-secondary)]">
												{d}
												<button
													onclick={() => removeCustomDate(d)}
													aria-label="Remove {d}"
													class="text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors"
												>
													<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
														<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
													</svg>
												</button>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Dates -->
						<div class="flex gap-4 flex-wrap">
							<div class="flex flex-col gap-1.5">
								<label for="goal-start" class="text-xs font-medium text-[var(--color-text-secondary)]">Start date</label>
								<input
									id="goal-start"
									type="date"
									bind:value={gStartDate}
									class="rounded-xl border border-[var(--color-surface-600)]
									       bg-[var(--color-surface-800)] px-3 py-2 text-sm
									       text-[var(--color-text-primary)]
									       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
								/>
							</div>
							<div class="flex flex-col gap-1.5">
								<!-- Checkbox label wrapping its control — valid a11y -->
								<label class="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
									<input
										type="checkbox"
										bind:checked={gHasEndDate}
										class="accent-[var(--color-accent-500)]"
									/>
									End date
								</label>
								{#if gHasEndDate}
									<input
										id="goal-end"
										type="date"
										bind:value={gEndDate}
										class="rounded-xl border border-[var(--color-surface-600)]
										       bg-[var(--color-surface-800)] px-3 py-2 text-sm
										       text-[var(--color-text-primary)]
										       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
									/>
								{/if}
							</div>
						</div>

						{#if goalError}
							<p class="text-xs text-[var(--color-error-400)]">{goalError}</p>
						{/if}

						<div class="flex gap-3">
							<button
								onclick={handleGoalSave}
								disabled={savingGoal}
								class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium
								       text-white hover:bg-[var(--color-accent-400)]
								       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{savingGoal ? 'Saving…' : 'Save'}
							</button>
							<button
								onclick={() => (showGoalForm = false)}
								class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				{/if}

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
								onEdit={openEditGoalForm}
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
