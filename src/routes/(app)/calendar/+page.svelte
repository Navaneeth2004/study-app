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
	import {
		listNotifications, createNotification, updateNotification,
		deleteNotification, toggleActive, scheduleAll, getPermissionStatus, requestPermission
	} from '$lib/notifications/notificationService';
	import NotificationCard from '$lib/notifications/components/NotificationCard.svelte';
	import CalendarGrid from '$lib/calendar/components/CalendarGrid.svelte';
	import GoalCard from '$lib/calendar/components/GoalCard.svelte';
	import Heatmap from '$lib/calendar/components/Heatmap.svelte';
	import DayLogModal from '$lib/calendar/components/DayLogModal.svelte';
	import GoalModal from '$lib/calendar/components/GoalModal.svelte';
	import NotificationModal from '$lib/calendar/components/NotificationModal.svelte';
	import type { CalendarDay, StudyLog, StudyGoal, MoodRating } from '$lib/calendar/calendarTypes';
	import type { StudyNotification, NotificationForm, NotificationPermissionStatus } from '$lib/notifications/notificationTypes';

	const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	const MOOD_EMOJI: Record<number, string> = { 1:'😔', 2:'😐', 3:'🙂', 4:'😊', 5:'🤩' };
	const PRESET_COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#06b6d4'];

	type Tab = 'calendar' | 'analytics' | 'goals' | 'notifications';
	type Period = 'week' | 'month' | 'year';

	// ── State ──────────────────────────────────────────────────────────────────
	let activeTab = $state<Tab>('calendar');
	let currentYear = $state(new Date().getFullYear());
	let currentMonth = $state(new Date().getMonth() + 1);
	let allLogs = $state<StudyLog[]>([]);
	let goals = $state<StudyGoal[]>([]);
	let notifications = $state<StudyNotification[]>([]);
	let notifPermission = $state<NotificationPermissionStatus>('default');
	let loading = $state(true);
	let error = $state('');
	let analyticsPeriod = $state<Period>('month');
	let periodOffset = $state(0);

	// Modal state
	let selectedDay = $state<CalendarDay | null>(null);
	let savingDay = $state(false);
	let editingGoal = $state<StudyGoal | null | 'new'>(null);
	let editingNotif = $state<StudyNotification | null | 'new'>(null);

	// ── Derived ────────────────────────────────────────────────────────────────
	const calendarDays = $derived(getCalendarDays(currentYear, currentMonth, allLogs));
	const streakCount = $derived(getStreakCount(allLogs));
	const longestStreak = $derived(getLongestStreak(allLogs));
	const totalLogged = $derived(allLogs.length);
	const heatmapData = $derived(getHeatmapData(allLogs));
	const weeklyActivity = $derived(getWeeklyActivity(allLogs, 10));
	const goalStatsList = $derived(goals.map((g) => getGoalStats(g, allLogs)));

	const periodLabel = $derived.by(() => {
		const today = new Date();
		if (analyticsPeriod === 'week') {
			const mon = new Date(today);
			mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) + periodOffset * 7);
			const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
			const s = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			const e = mon.getMonth() === sun.getMonth() ? String(sun.getDate()) : sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			return `${s} – ${e}`;
		} else if (analyticsPeriod === 'month') {
			return new Date(today.getFullYear(), today.getMonth() + periodOffset, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		}
		return String(today.getFullYear() + periodOffset);
	});

	const periodLogs = $derived.by(() => {
		const today = new Date();
		let start: Date; let end: Date;
		if (analyticsPeriod === 'week') {
			start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7) + periodOffset * 7); start.setHours(0,0,0,0);
			end = new Date(start); end.setDate(start.getDate() + 6);
		} else if (analyticsPeriod === 'month') {
			start = new Date(today.getFullYear(), today.getMonth() + periodOffset, 1);
			end = new Date(today.getFullYear(), today.getMonth() + periodOffset + 1, 0);
		} else {
			start = new Date(today.getFullYear() + periodOffset, 0, 1);
			end = new Date(today.getFullYear() + periodOffset, 11, 31);
		}
		return allLogs.filter((l) => l.date >= formatDate(start) && l.date <= formatDate(end));
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

	// ── Data loading ───────────────────────────────────────────────────────────
	onMount(async () => {
		loading = true;
		notifPermission = getPermissionStatus();
		try {
			const year = new Date().getFullYear();
			const [logs, gs, ns] = await Promise.all([
				getLogsForRange(`${year-1}-01-01`, `${year+1}-12-31`),
				listGoals(), listNotifications()
			]);
			allLogs = logs; goals = gs; notifications = ns;
			scheduleAll(ns);
		} catch (e) { error = e instanceof Error ? e.message : 'Could not load calendar data.'; }
		finally { loading = false; }
	});

	// ── Navigation ─────────────────────────────────────────────────────────────
	function prevMonth() { if (currentMonth===1){currentYear--;currentMonth=12;}else currentMonth--; selectedDay=null; }
	function nextMonth() { if (currentMonth===12){currentYear++;currentMonth=1;}else currentMonth++; selectedDay=null; }
	function goToday() { const n=new Date(); currentYear=n.getFullYear(); currentMonth=n.getMonth()+1; selectedDay=null; }

	// ── Day log actions ────────────────────────────────────────────────────────
	async function handleDaySave(data: LogData & { mood: MoodRating | null }) {
		if (!selectedDay) return;
		savingDay = true;
		try {
			const saved = await createLog(selectedDay.date, data);
			allLogs = [...allLogs.filter((l) => l.date !== selectedDay!.date), saved].sort((a,b) => a.date.localeCompare(b.date));
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
		} finally { savingDay = false; }
	}

	// ── Goal actions ───────────────────────────────────────────────────────────
	async function handleGoalSave(data: GoalData) {
		const id = editingGoal && editingGoal !== 'new' ? editingGoal.id : null;
		if (id) { const u = await updateGoal(id, data); goals = goals.map((g) => g.id===id ? u : g); }
		else goals = [...goals, await createGoal(data)];
	}
	async function handleGoalDelete(id: string) { try { await deleteGoal(id); goals = goals.filter((g) => g.id!==id); } catch(e){error=e instanceof Error?e.message:'Could not delete.';} }
	async function handleToggleGoalActive(id: string, isActive: boolean) { try { await toggleGoalActive(id,isActive); goals=goals.map((g)=>g.id===id?{...g,isActive}:g); } catch(e){error=e instanceof Error?e.message:'Could not update.';} }

	// ── Notification actions ───────────────────────────────────────────────────
	async function handleNotifSave(form: NotificationForm) {
		const id = editingNotif && editingNotif !== 'new' ? editingNotif.id : null;
		if (id) { const u = await updateNotification(id, form); notifications = notifications.map((n) => n.id===id ? u : n); }
		else notifications = [...notifications, await createNotification(form)];
		scheduleAll(notifications);
	}
	async function handleNotifDelete(id: string) { try { await deleteNotification(id); notifications=notifications.filter((n)=>n.id!==id); scheduleAll(notifications); } catch(e){error=e instanceof Error?e.message:'Could not delete.';} }
	async function handleNotifToggle(id: string, isActive: boolean) { try { await toggleActive(id,isActive); notifications=notifications.map((n)=>n.id===id?{...n,isActive}:n); scheduleAll(notifications); } catch(e){error=e instanceof Error?e.message:'Could not update.';} }
	async function handleEnablePermission() { notifPermission = await requestPermission(); }
</script>

<svelte:head><title>Calendar — StudyApp</title></svelte:head>

<!-- Modals -->
{#if selectedDay && !selectedDay.isPadding}
	<DayLogModal
		day={selectedDay}
		saving={savingDay}
		onSave={handleDaySave}
		onDelete={handleDayDelete}
		onClose={() => (selectedDay = null)}
	/>
{/if}

{#if editingGoal !== null}
	<GoalModal
		goal={editingGoal === 'new' ? null : editingGoal}
		onSave={handleGoalSave}
		onClose={() => (editingGoal = null)}
	/>
{/if}

{#if editingNotif !== null}
	<NotificationModal
		notification={editingNotif === 'new' ? null : editingNotif}
		presetColors={PRESET_COLORS}
		onSave={handleNotifSave}
		onClose={() => (editingNotif = null)}
	/>
{/if}

<div class="flex flex-col gap-4 max-w-lg">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Study Calendar</h1>
		<p class="text-[var(--color-text-secondary)]">Track your study days and build habits.</p>
	</div>

	{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

	{#if loading}
		<div class="flex flex-col gap-3">
			{#each Array(3) as _}<div class="h-16 rounded-xl bg-[var(--color-surface-800)]"></div>{/each}
		</div>
	{:else}
		<!-- Tabs -->
		<div class="flex gap-1 border-b border-[var(--color-surface-700)]">
			{#each (['calendar','analytics','goals','notifications'] as Tab[]) as tab}
				<button onclick={() => (activeTab = tab)}
					class="px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors
					       {activeTab===tab?'border-[var(--color-accent-500)] text-[var(--color-accent-400)]':'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
					{tab}
				</button>
			{/each}
		</div>

		{#if activeTab === 'calendar'}
		<!-- ── CALENDAR ──────────────────────────────────────────────────────── -->
		<div class="flex flex-col gap-4">
			<div class="flex items-center gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-5 py-3">
				<span class="text-sm text-[var(--color-text-secondary)]">🔥 Current streak: <strong class="text-[var(--color-text-primary)]">{streakCount}</strong> {streakCount===1?'day':'days'}</span>
				<span class="text-xs text-[var(--color-text-muted)]">Best: {longestStreak} {longestStreak===1?'day':'days'}</span>
			</div>
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<button onclick={prevMonth} aria-label="Previous month" class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
					</button>
					<span class="text-base font-semibold text-[var(--color-text-primary)] min-w-36 text-center">{MONTH_NAMES[currentMonth-1]} {currentYear}</span>
					<button onclick={nextMonth} aria-label="Next month" class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
					</button>
				</div>
				<button onclick={goToday} class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">Today</button>
			</div>
			<CalendarGrid year={currentYear} month={currentMonth} days={calendarDays} selectedDate={selectedDay?.date ?? null} onDayClick={(day) => (selectedDay = day)} />
		</div>

		{:else if activeTab === 'analytics'}
		<!-- ── ANALYTICS ─────────────────────────────────────────────────────── -->
		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-3 gap-3">
				<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3"><span class="text-xs text-[var(--color-text-muted)]">Current Streak</span><span class="text-2xl font-semibold text-[var(--color-text-primary)]">{streakCount} 🔥</span></div>
				<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3"><span class="text-xs text-[var(--color-text-muted)]">Longest Streak</span><span class="text-2xl font-semibold text-[var(--color-text-primary)]">{longestStreak} 🏆</span></div>
				<div class="flex flex-col gap-1 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] px-4 py-3"><span class="text-xs text-[var(--color-text-muted)]">Total Days</span><span class="text-2xl font-semibold text-[var(--color-text-primary)]">{totalLogged}</span></div>
			</div>
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Weekly Activity</span>
				<div class="flex items-end gap-1.5 h-24">
					{#each weeklyActivity as week}
						<div class="flex flex-1 flex-col items-center gap-1 group">
							<div class="relative w-full flex items-end justify-center" style="height:72px;">
								<div class="w-full rounded-t-sm transition-all" style="height:{week.days===0?'2px':Math.max(4,(week.days/7)*72)+'px'};background:{week.days>0?'var(--color-accent-500)':'var(--color-surface-700)'};" title="Week of {week.label}: {week.days} {week.days===1?'day':'days'} studied{week.minutes>0?', '+week.minutes+' min':''}"></div>
								<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-10">
									<div class="rounded-lg bg-[var(--color-surface-800)] border border-[var(--color-surface-600)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] shadow-lg">
										<div class="font-medium">{week.label}</div>
										<div class="text-[var(--color-text-muted)]">{week.days} {week.days===1?'day':'days'}{week.minutes>0?' · '+week.minutes+' min':''}</div>
									</div>
								</div>
							</div>
							<span class="text-[9px] text-[var(--color-text-muted)] truncate w-full text-center leading-none">{week.label.split(' – ')[0]}</span>
						</div>
					{/each}
				</div>
			</div>
			<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Activity — past 52 weeks</span>
				<Heatmap data={heatmapData} />
			</div>
			<div class="flex flex-col gap-4 rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-4">
				<div class="flex items-center justify-between gap-2 flex-wrap">
					<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Summary</span>
					<div class="flex gap-1">
						{#each (['week','month','year'] as Period[]) as p}
							<button onclick={() => { analyticsPeriod=p; periodOffset=0; }} class="rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors {analyticsPeriod===p?'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]':'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">{p}</button>
						{/each}
					</div>
				</div>
				<div class="flex items-center justify-between gap-2">
					<button onclick={() => periodOffset--} aria-label="Previous period" class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
					<span class="text-sm font-medium text-[var(--color-text-secondary)]">{periodLabel}</span>
					<button onclick={() => { if(periodOffset<0) periodOffset++; }} disabled={periodOffset>=0} aria-label="Next period" class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
				</div>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="flex flex-col gap-0.5"><span class="text-xs text-[var(--color-text-muted)]">Days studied</span><span class="text-lg font-semibold text-[var(--color-text-primary)]">{periodStats.totalDays}</span></div>
					<div class="flex flex-col gap-0.5"><span class="text-xs text-[var(--color-text-muted)]">Avg mood</span><span class="text-lg font-semibold text-[var(--color-text-primary)]">{#if periodStats.avgMood!==null}{MOOD_EMOJI[Math.round(periodStats.avgMood)]} <span class="text-sm text-[var(--color-text-secondary)]">{periodStats.avgMood.toFixed(1)}</span>{:else}—{/if}</span></div>
					<div class="flex flex-col gap-0.5"><span class="text-xs text-[var(--color-text-muted)]">Minutes studied</span><span class="text-lg font-semibold text-[var(--color-text-primary)]">{periodStats.totalMinutes>0?periodStats.totalMinutes:'—'}</span></div>
					<div class="flex flex-col gap-0.5"><span class="text-xs text-[var(--color-text-muted)]">Most active</span><span class="text-lg font-semibold text-[var(--color-text-primary)]">{periodStats.mostActiveDay??'—'}</span></div>
				</div>
			</div>
		</div>

		{:else if activeTab === 'goals'}
		<!-- ── GOALS ──────────────────────────────────────────────────────────── -->
		<div class="flex flex-col gap-5">
			<div class="flex items-center justify-between gap-4">
				<p class="text-sm text-[var(--color-text-secondary)]">A day counts toward a goal if you log any study activity.</p>
				<button onclick={() => (editingGoal = 'new')} class="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					New Goal
				</button>
			</div>
			{#if goals.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-surface-600)] py-12 text-center">
					<p class="text-sm font-medium text-[var(--color-text-secondary)]">No goals yet</p>
					<p class="text-sm text-[var(--color-text-muted)]">Create a goal to track your study habits.</p>
				</div>
			{:else}
				<div class="flex flex-col gap-3">
					{#each goals as goal, i (goal.id)}
						<GoalCard {goal} stats={goalStatsList[i]} onEdit={(g) => (editingGoal = g)} onDelete={handleGoalDelete} onToggleActive={handleToggleGoalActive} />
					{/each}
				</div>
			{/if}
		</div>

		{:else if activeTab === 'notifications'}
		<!-- ── NOTIFICATIONS ──────────────────────────────────────────────────── -->
		<div class="flex flex-col gap-5">
			{#if notifPermission === 'granted'}
				<div class="flex items-center gap-2 rounded-xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/5 px-4 py-2.5">
					<div class="h-2 w-2 rounded-full bg-[var(--color-success-500)]"></div>
					<span class="text-sm text-[var(--color-success-500)]">Notifications enabled</span>
				</div>
			{:else}
				<div class="flex items-center gap-3 rounded-xl border border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/5 px-4 py-3">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[var(--color-warning-400)]"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
					<span class="flex-1 text-sm text-[var(--color-text-secondary)]">{notifPermission==='denied'?'Notifications blocked — enable in browser settings':'Notifications not yet enabled'}</span>
					{#if notifPermission !== 'denied'}
						<button onclick={handleEnablePermission} class="shrink-0 rounded-lg bg-[var(--color-accent-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">Enable</button>
					{/if}
				</div>
			{/if}

			<div class="flex items-center justify-between gap-4">
				<p class="text-sm text-[var(--color-text-secondary)]">Custom reminders that fire at scheduled times.</p>
				<button onclick={() => (editingNotif = 'new')} class="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					New Notification
				</button>
			</div>

			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-surface-600)] py-12 text-center">
					<p class="text-sm font-medium text-[var(--color-text-secondary)]">No notifications yet</p>
					<p class="text-sm text-[var(--color-text-muted)]">Create a notification to get study reminders.</p>
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					{#each notifications as n (n.id)}
						<NotificationCard notification={n} onEdit={(notif) => (editingNotif = notif)} onDelete={handleNotifDelete} onToggle={handleNotifToggle} />
					{/each}
				</div>
			{/if}
		</div>
		{/if}
	{/if}
</div>
