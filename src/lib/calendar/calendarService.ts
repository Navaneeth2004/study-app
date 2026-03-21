import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { StudyLog, StudyGoal, GoalType, MoodRating } from './calendarTypes';

// ── Mappers ───────────────────────────────────────────────────────────────────

function toLog(r: Record<string, unknown>): StudyLog {
	return {
		id: r.id as string,
		user: r.user as string,
		date: r.date as string,
		description: (r.description as string) ?? '',
		mood: (r.mood as MoodRating) ?? null,
		duration: (r.duration as number) ?? null,
		created: r.created as string
	};
}

function toGoal(r: Record<string, unknown>): StudyGoal {
	return {
		id: r.id as string,
		user: r.user as string,
		title: r.title as string,
		type: r.type as GoalType,
		targetDays: (r.targetDays as string[]) ?? null,
		targetDaysOfWeek: (r.targetDaysOfWeek as number[]) ?? null,
		targetMinutes: (r.targetMinutes as number) ?? null,
		startDate: r.startDate as string,
		endDate: (r.endDate as string) || null,
		isActive: (r.isActive as boolean) ?? true,
		created: r.created as string
	};
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function getLogsForMonth(year: number, month: number): Promise<StudyLog[]> {
	const start = `${year}-${String(month).padStart(2, '0')}-01`;
	const end = `${year}-${String(month).padStart(2, '0')}-31`;
	return getLogsForRange(start, end);
}

export async function getLogsForRange(startDate: string, endDate: string): Promise<StudyLog[]> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const records = await pb.collection('study_logs').getFullList({
			filter: `user = "${uid}" && date >= "${startDate}" && date <= "${endDate}"`,
			sort: 'date',
			requestKey: null
		});
		return records.map(toLog);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function getLogForDate(date: string): Promise<StudyLog | null> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const records = await pb.collection('study_logs').getFullList({
			filter: `user = "${uid}" && date = "${date}"`,
			requestKey: null
		});
		return records.length > 0 ? toLog(records[0]) : null;
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export interface LogData {
	description?: string;
	mood?: MoodRating | null;
	duration?: number | null;
}

/** Creates or updates the log for the given date (one log per day per user). */
export async function createLog(date: string, data: LogData = {}): Promise<StudyLog> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const existing = await getLogForDate(date);
		if (existing) {
			return await updateLog(existing.id, data);
		}
		const r = await pb.collection('study_logs').create({
			user: uid,
			date,
			description: data.description ?? '',
			mood: data.mood ?? null,
			duration: data.duration ?? null
		}, { requestKey: null });
		return toLog(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateLog(id: string, data: LogData): Promise<StudyLog> {
	try {
		const r = await pb.collection('study_logs').update(id, {
			description: data.description ?? '',
			mood: data.mood ?? null,
			duration: data.duration ?? null
		}, { requestKey: null });
		return toLog(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteLog(id: string): Promise<void> {
	try {
		await pb.collection('study_logs').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function listGoals(): Promise<StudyGoal[]> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		const records = await pb.collection('study_goals').getFullList({
			filter: `user = "${uid}"`,
			sort: '-isActive,created',
			requestKey: null
		});
		return records.map(toGoal);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export interface GoalData {
	title: string;
	type: GoalType;
	targetDays?: string[] | null;
	targetDaysOfWeek?: number[] | null;
	targetMinutes?: number | null;
	startDate: string;
	endDate?: string | null;
	isActive?: boolean;
}

export async function createGoal(data: GoalData): Promise<StudyGoal> {
	try {
		const r = await pb.collection('study_goals').create({
			user: pb.authStore.record?.id,
			...data,
			endDate: data.endDate || null,
			isActive: data.isActive ?? true
		});
		return toGoal(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateGoal(id: string, data: Partial<GoalData>): Promise<StudyGoal> {
	try {
		const r = await pb.collection('study_goals').update(id, data);
		return toGoal(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteGoal(id: string): Promise<void> {
	try {
		await pb.collection('study_goals').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function toggleGoalActive(id: string, isActive: boolean): Promise<void> {
	try {
		await pb.collection('study_goals').update(id, { isActive });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}
