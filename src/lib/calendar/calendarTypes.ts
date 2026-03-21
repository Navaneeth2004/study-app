export type GoalType = 'daily' | 'weekly' | 'custom';
export type MoodRating = 1 | 2 | 3 | 4 | 5;

export interface StudyLog {
	id: string;
	user: string;
	date: string;
	description: string;
	mood: MoodRating | null;
	duration: number | null;
	created: string;
}

export interface StudyGoal {
	id: string;
	user: string;
	title: string;
	type: GoalType;
	targetDays: string[] | null;
	targetDaysOfWeek: number[] | null;
	targetMinutes: number | null;
	startDate: string;
	endDate: string | null;
	isActive: boolean;
	created: string;
}

export interface CalendarDay {
	date: string;
	log: StudyLog | null;
	isToday: boolean;
	isFuture: boolean;
	isPadding: boolean;
}

export interface GoalStats {
	goal: StudyGoal;
	totalTargetDays: number;
	completedDays: number;
	missedDays: number;
	pendingDays: number;
	completionRate: number;
	completedDates: string[];
	missedDates: string[];
}
