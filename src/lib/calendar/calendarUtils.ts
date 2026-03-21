import type { CalendarDay, StudyLog, StudyGoal, GoalStats } from './calendarTypes';

export function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
	const [y, m, d] = dateStr.split('-').map(Number);
	return new Date(y, m - 1, d);
}

function datesInRange(start: string, end: string): string[] {
	const dates: string[] = [];
	const cursor = parseDate(start);
	const last = parseDate(end);
	while (cursor <= last) {
		dates.push(formatDate(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}
	return dates;
}

export function getCalendarDays(year: number, month: number, logs: StudyLog[]): CalendarDay[] {
	const today = formatDate(new Date());
	const logMap = new Map(logs.map((l) => [l.date, l]));
	const firstDay = new Date(year, month - 1, 1);
	const daysInMonth = new Date(year, month, 0).getDate();
	const startOffset = (firstDay.getDay() + 6) % 7;
	const days: CalendarDay[] = [];

	for (let i = startOffset - 1; i >= 0; i--) {
		const date = formatDate(new Date(year, month - 1, -i));
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: true });
	}
	for (let d = 1; d <= daysInMonth; d++) {
		const date = formatDate(new Date(year, month - 1, d));
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: false });
	}
	let nextDay = 1;
	while (days.length % 7 !== 0) {
		const date = formatDate(new Date(year, month, nextDay++));
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: true });
	}
	return days;
}

export function getStreakCount(logs: StudyLog[]): number {
	const dateSet = new Set(logs.map((l) => l.date));
	const today = formatDate(new Date());
	const cursor = new Date();
	if (!dateSet.has(today)) cursor.setDate(cursor.getDate() - 1);
	let streak = 0;
	while (dateSet.has(formatDate(cursor))) {
		streak++;
		cursor.setDate(cursor.getDate() - 1);
	}
	return streak;
}

export function getLongestStreak(logs: StudyLog[]): number {
	const sorted = [...new Set(logs.map((l) => l.date))].sort();
	if (sorted.length === 0) return 0;
	let longest = 1, current = 1;
	for (let i = 1; i < sorted.length; i++) {
		const diff = (parseDate(sorted[i]).getTime() - parseDate(sorted[i - 1]).getTime()) / 86_400_000;
		if (diff === 1) { current++; if (current > longest) longest = current; }
		else current = 1;
	}
	return longest;
}

function dayCompletedForGoal(goal: StudyGoal, log: StudyLog | undefined): boolean {
	if (!log) return false;
	if (goal.targetMinutes && goal.targetMinutes > 0) {
		return (log.duration ?? 0) >= goal.targetMinutes;
	}
	return true;
}

export function getGoalStats(goal: StudyGoal, logs: StudyLog[]): GoalStats {
	const today = formatDate(new Date());
	const logMap = new Map(logs.map((l) => [l.date, l]));

	if (goal.startDate > today) {
		return { goal, totalTargetDays: 0, completedDays: 0, missedDays: 0, pendingDays: 0, completionRate: 0, completedDates: [], missedDates: [] };
	}

	const rangeEnd = goal.endDate ?? today;
	const effectiveEnd = rangeEnd < today ? rangeEnd : today;
	const allInRange = datesInRange(goal.startDate, effectiveEnd);

	let targetDates: string[] = [];
	if (goal.type === 'daily') {
		targetDates = allInRange;
	} else if (goal.type === 'weekly') {
		const dow = goal.targetDaysOfWeek ?? [];
		targetDates = allInRange.filter((d) => dow.includes(parseDate(d).getDay()));
	} else {
		targetDates = (goal.targetDays ?? []).filter((d) => d >= goal.startDate && d <= effectiveEnd);
	}

	// Future pending dates
	const futureTargetDates: string[] = [];
	if (goal.endDate && goal.endDate > today) {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const futureRange = datesInRange(formatDate(tomorrow), goal.endDate);
		if (goal.type === 'daily') {
			futureTargetDates.push(...futureRange);
		} else if (goal.type === 'weekly') {
			const dow = goal.targetDaysOfWeek ?? [];
			futureTargetDates.push(...futureRange.filter((d) => dow.includes(parseDate(d).getDay())));
		} else {
			futureTargetDates.push(...(goal.targetDays ?? []).filter((d) => d > today && d <= goal.endDate!));
		}
	}

	const completedDates = targetDates.filter((d) => dayCompletedForGoal(goal, logMap.get(d)));
	const missedDates = targetDates.filter((d) => !dayCompletedForGoal(goal, logMap.get(d)));
	const pendingDays = futureTargetDates.length;
	const totalTargetDays = targetDates.length + pendingDays;
	const completionRate = totalTargetDays > 0 ? completedDates.length / totalTargetDays : 0;

	return {
		goal,
		totalTargetDays,
		completedDays: completedDates.length,
		missedDays: missedDates.length,
		pendingDays,
		completionRate,
		completedDates,
		missedDates
	};
}

export function getHeatmapData(logs: StudyLog[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const log of logs) {
		const dur = log.duration ?? 0;
		let intensity: number;
		if (dur === 0) intensity = 1;
		else if (dur < 30) intensity = 1;
		else if (dur < 60) intensity = 2;
		else if (dur < 120) intensity = 3;
		else intensity = 4;
		map.set(log.date, intensity);
	}
	return map;
}

/** Returns past N weeks of activity: array of { weekLabel, days, totalMinutes } */
export function getWeeklyActivity(logs: StudyLog[], weeks = 10): Array<{ label: string; days: number; minutes: number }> {
	const result: Array<{ label: string; days: number; minutes: number }> = [];
	const today = new Date();

	for (let w = weeks - 1; w >= 0; w--) {
		const weekStart = new Date(today);
		weekStart.setDate(today.getDate() - today.getDay() - w * 7 + 1); // Monday
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 6);

		const startStr = formatDate(weekStart);
		const endStr = formatDate(weekEnd);
		const weekLogs = logs.filter((l) => l.date >= startStr && l.date <= endStr);

		const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		result.push({
			label,
			days: weekLogs.length,
			minutes: weekLogs.reduce((s, l) => s + (l.duration ?? 0), 0)
		});
	}
	return result;
}
