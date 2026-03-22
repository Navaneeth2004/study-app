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
	const current = parseDate(start);
	const last = parseDate(end);
	while (current <= last) {
		dates.push(formatDate(current));
		current.setDate(current.getDate() + 1);
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
		const d = new Date(year, month - 1, -i);
		const date = formatDate(d);
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
	while (dateSet.has(formatDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
	return streak;
}

export function getLongestStreak(logs: StudyLog[]): number {
	const sorted = [...new Set(logs.map((l) => l.date))].sort();
	if (sorted.length === 0) return 0;
	let longest = 1; let current = 1;
	for (let i = 1; i < sorted.length; i++) {
		const diff = (parseDate(sorted[i]).getTime() - parseDate(sorted[i - 1]).getTime()) / 86_400_000;
		if (diff === 1) { current++; if (current > longest) longest = current; } else { current = 1; }
	}
	return longest;
}

export function getGoalStats(goal: StudyGoal, logs: StudyLog[]): GoalStats {
	const today = formatDate(new Date());
	const logDates = new Set(logs.map((l) => l.date));
	const rangeEnd = goal.endDate ?? today;
	const effectiveEnd = rangeEnd < today ? rangeEnd : today;
	let targetDates: string[] = [];
	const allInRange = datesInRange(goal.startDate, effectiveEnd);
	if (goal.type === 'daily') targetDates = allInRange;
	else if (goal.type === 'weekly') {
		const dow = goal.targetDaysOfWeek ?? [];
		targetDates = allInRange.filter((d) => dow.includes(parseDate(d).getDay()));
	} else {
		targetDates = (goal.targetDays ?? []).filter((d) => d >= goal.startDate && d <= effectiveEnd);
	}
	const completedDays = targetDates.filter((d) => logDates.has(d)).length;
	const missedDays = targetDates.filter((d) => d < today && !logDates.has(d)).length;
	const pendingDays = targetDates.filter((d) => d > today || (d === today && !logDates.has(today))).length;
	const totalTargetDays = targetDates.length;
	const completionRate = totalTargetDays > 0 ? completedDays / totalTargetDays : 0;
	return { goal, totalTargetDays, completedDays, missedDays, pendingDays, completionRate };
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

export interface WeekActivity {
	/** Label like "Mar 16 – 22" */
	label: string;
	/** ISO date of Monday that starts this week */
	weekStart: string;
	days: number;
	minutes: number;
}

/**
 * Returns weekly activity for the past N weeks (default 10),
 * each with a human-readable "Mar 16 – 22" label.
 */
export function getWeeklyActivity(logs: StudyLog[], weeks = 10): WeekActivity[] {
	const logMap = new Map(logs.map((l) => [l.date, l]));
	const today = new Date();

	// Find the Monday of the current week
	const currentMonday = new Date(today);
	const dow = (today.getDay() + 6) % 7; // Mon=0
	currentMonday.setDate(today.getDate() - dow);
	currentMonday.setHours(0, 0, 0, 0);

	const result: WeekActivity[] = [];

	for (let w = weeks - 1; w >= 0; w--) {
		const monday = new Date(currentMonday);
		monday.setDate(currentMonday.getDate() - w * 7);

		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		// Build label e.g. "Mar 16 – 22" or "Mar 28 – Apr 3"
		const startLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const endSameMonth = monday.getMonth() === sunday.getMonth();
		const endLabel = endSameMonth
			? sunday.getDate()
			: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const label = `${startLabel} – ${endLabel}`;

		// Count logs in this week
		let days = 0; let minutes = 0;
		for (let d = 0; d < 7; d++) {
			const date = new Date(monday);
			date.setDate(monday.getDate() + d);
			const dateStr = formatDate(date);
			if (dateStr > formatDate(today)) break;
			const log = logMap.get(dateStr);
			if (log) { days++; minutes += log.duration ?? 0; }
		}

		result.push({ label, weekStart: formatDate(monday), days, minutes });
	}
	return result;
}
