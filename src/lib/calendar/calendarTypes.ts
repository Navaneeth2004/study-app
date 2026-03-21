export type GoalType = 'daily' | 'weekly' | 'custom';
export type MoodRating = 1 | 2 | 3 | 4 | 5;

export interface StudyLog {
	id: string;
	user: string;
	date: string; // YYYY-MM-DD
	description: string;
	mood: MoodRating | null;
	duration: number | null; // minutes
	created: string;
}

export interface StudyGoal {
	id: string;
	user: string;
	title: string;
	type: GoalType;
	targetDays: string[] | null;        // custom: specific dates
	targetDaysOfWeek: number[] | null;  // weekly: 0=Sun … 6=Sat
	targetMinutes: number | null;
	startDate: string;
	endDate: string | null;
	isActive: boolean;
	created: string;
}

export interface CalendarDay {
	date: string; // YYYY-MM-DD
	log: StudyLog | null;
	isToday: boolean;
	isFuture: boolean;
	isPadding: boolean; // belongs to prev/next month
}

export interface GoalStats {
	goal: StudyGoal;
	totalTargetDays: number;
	completedDays: number;
	missedDays: number;
	pendingDays: number;
	completionRate: number; // 0–1
}
