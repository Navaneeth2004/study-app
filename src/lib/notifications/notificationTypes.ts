export type ScheduleType = 'once' | 'daily' | 'weekly';
export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface StudyNotification {
	id: string;
	user: string;
	title: string;
	body: string;
	icon: string;
	color: string;
	scheduleType: ScheduleType;
	scheduledAt: string | null;     // ISO string for once
	dailyTimes: string[] | null;    // ["08:00", "20:00"]
	weeklyDays: number[] | null;    // [0-6]
	weeklyTimes: string[] | null;
	isActive: boolean;
	lastFiredAt: string | null;
	created: string;
}

export interface NotificationForm {
	title: string;
	body: string;
	icon: string;
	color: string;
	scheduleType: ScheduleType;
	scheduledAt: string;
	scheduledTime: string;
	dailyTimes: string[];
	weeklyDays: number[];
	weeklyTimes: string[];
	isActive: boolean;
}
