import type { CalendarDay, StudyLog, StudyGoal, GoalStats } from './calendarTypes';

// ── Date helpers ──────────────────────────────────────────────────────────────

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

// ── Calendar grid ─────────────────────────────────────────────────────────────

/** Returns a full 7-column grid (Mon start) for the given month, including padding days. */
export function getCalendarDays(
	year: number,
	month: number,
	logs: StudyLog[]
): CalendarDay[] {
	const today = formatDate(new Date());
	const logMap = new Map(logs.map((l) => [l.date, l]));

	const firstDay = new Date(year, month - 1, 1);
	const daysInMonth = new Date(year, month, 0).getDate();

	// Monday-start offset: Mon=0 … Sun=6
	const startOffset = (firstDay.getDay() + 6) % 7;

	const days: CalendarDay[] = [];

	// Padding: days from previous month
	for (let i = startOffset - 1; i >= 0; i--) {
		const d = new Date(year, month - 1, -i);
		const date = formatDate(d);
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: true });
	}

	// Current month
	for (let d = 1; d <= daysInMonth; d++) {
		const date = formatDate(new Date(year, month - 1, d));
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: false });
	}

	// Padding: days from next month to complete final row
	let nextDay = 1;
	while (days.length % 7 !== 0) {
		const date = formatDate(new Date(year, month, nextDay++));
		days.push({ date, log: logMap.get(date) ?? null, isToday: date === today, isFuture: date > today, isPadding: true });
	}

	return days;
}

// ── Streaks ───────────────────────────────────────────────────────────────────

export function getStreakCount(logs: StudyLog[]): number {
	const dateSet = new Set(logs.map((l) => l.date));
	const today = formatDate(new Date());
	const cursor = new Date();

	// If today has no log, start counting from yesterday
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

	let longest = 1;
	let current = 1;
	for (let i = 1; i < sorted.length; i++) {
		const prev = parseDate(sorted[i - 1]);
		const curr = parseDate(sorted[i]);
		const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
		if (diff === 1) {
			current++;
			if (current > longest) longest = current;
		} else {
			current = 1;
		}
	}
	return longest;
}

// ── Goal stats ────────────────────────────────────────────────────────────────

export function getGoalStats(goal: StudyGoal, logs: StudyLog[]): GoalStats {
	const today = formatDate(new Date());
	const logDates = new Set(logs.map((l) => l.date));
	const rangeEnd = goal.endDate ?? today;
	const effectiveEnd = rangeEnd < today ? rangeEnd : today;

	let targetDates: string[] = [];
	const allInRange = datesInRange(goal.startDate, effectiveEnd);

	if (goal.type === 'daily') {
		targetDates = allInRange;
	} else if (goal.type === 'weekly') {
		const dow = goal.targetDaysOfWeek ?? [];
		targetDates = allInRange.filter((d) => dow.includes(parseDate(d).getDay()));
	} else {
		// custom: targetDays intersected with valid range
		targetDates = (goal.targetDays ?? []).filter(
			(d) => d >= goal.startDate && d <= effectiveEnd
		);
	}

	const completedDays = targetDates.filter((d) => logDates.has(d)).length;
	const missedDays = targetDates.filter((d) => d < today && !logDates.has(d)).length;
	const pendingDays = targetDates.filter(
		(d) => d > today || (d === today && !logDates.has(today))
	).length;
	const totalTargetDays = targetDates.length;
	const completionRate = totalTargetDays > 0 ? completedDays / totalTargetDays : 0;

	return { goal, totalTargetDays, completedDays, missedDays, pendingDays, completionRate };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

/** Returns date → intensity (1–4) for all logs. 0 means no log (caller handles missing keys). */
export function getHeatmapData(logs: StudyLog[], _year?: number): Map<string, number> {
	const map = new Map<string, number>();
	for (const log of logs) {
		let intensity: number;
		const dur = log.duration ?? 0;
		if (dur === 0) intensity = 1;
		else if (dur < 30) intensity = 1;
		else if (dur < 60) intensity = 2;
		else if (dur < 120) intensity = 3;
		else intensity = 4;
		map.set(log.date, intensity);
	}
	return map;
}
