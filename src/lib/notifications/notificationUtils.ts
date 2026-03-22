import type { StudyNotification } from './notificationTypes';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatTime(timeStr: string): string {
	const [h, m] = timeStr.split(':').map(Number);
	const ampm = h >= 12 ? 'PM' : 'AM';
	const hour = h % 12 || 12;
	return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatTimes(times: string[]): string {
	if (!times || times.length === 0) return '';
	const formatted = times.map(formatTime);
	if (formatted.length === 1) return formatted[0];
	return formatted.slice(0, -1).join(', ') + ' and ' + formatted[formatted.length - 1];
}

/**
 * Returns the next Date this notification will fire, or null if none.
 * Pure function — no side effects, no PocketBase.
 */
export function getNextFireTime(notification: StudyNotification): Date | null {
	if (!notification.isActive) return null;
	const now = new Date();

	if (notification.scheduleType === 'once') {
		if (!notification.scheduledAt) return null;
		const t = new Date(notification.scheduledAt);
		return t > now ? t : null;
	}

	if (notification.scheduleType === 'daily') {
		const times = notification.dailyTimes ?? [];
		if (times.length === 0) return null;
		// Try today then tomorrow
		for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
			for (const timeStr of [...times].sort()) {
				const [h, m] = timeStr.split(':').map(Number);
				const candidate = new Date(now);
				candidate.setDate(candidate.getDate() + dayOffset);
				candidate.setHours(h, m, 0, 0);
				if (candidate > now) return candidate;
			}
		}
		return null;
	}

	if (notification.scheduleType === 'weekly') {
		const days = notification.weeklyDays ?? [];
		const times = notification.weeklyTimes ?? [];
		if (days.length === 0 || times.length === 0) return null;
		// Look up to 8 days ahead
		const sortedTimes = [...times].sort();
		for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
			const candidate = new Date(now);
			candidate.setDate(candidate.getDate() + dayOffset);
			const dow = candidate.getDay();
			if (!days.includes(dow)) continue;
			for (const timeStr of sortedTimes) {
				const [h, m] = timeStr.split(':').map(Number);
				const t = new Date(candidate);
				t.setHours(h, m, 0, 0);
				if (t > now) return t;
			}
		}
		return null;
	}

	return null;
}

/** Human-readable schedule summary. Pure function. */
export function formatScheduleSummary(notification: StudyNotification): string {
	if (notification.scheduleType === 'once') {
		if (!notification.scheduledAt) return 'Once (unscheduled)';
		const d = new Date(notification.scheduledAt);
		const dateStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
		const timeStr = formatTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
		return `Once on ${dateStr} at ${timeStr}`;
	}

	if (notification.scheduleType === 'daily') {
		const times = notification.dailyTimes ?? [];
		if (times.length === 0) return 'Daily (no time set)';
		return `Daily at ${formatTimes(times)}`;
	}

	if (notification.scheduleType === 'weekly') {
		const days = (notification.weeklyDays ?? []).sort();
		const times = notification.weeklyTimes ?? [];
		if (days.length === 0 || times.length === 0) return 'Weekly (incomplete)';
		const dayLabels = days.map((d) => DAYS_SHORT[d]).join(', ');
		return `Every ${dayLabels} at ${formatTimes(times)}`;
	}

	return '';
}

/** True if a once-type notification is past its fire time */
export function isOverdue(notification: StudyNotification): boolean {
	if (notification.scheduleType !== 'once') return false;
	if (!notification.scheduledAt) return false;
	return new Date(notification.scheduledAt) < new Date();
}

/** Format a Date for display */
export function formatNextTime(date: Date | null): string {
	if (!date) return '';
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMins = Math.round(diffMs / 60_000);
	if (diffMins < 60) return `in ${diffMins} min`;
	if (diffMins < 24 * 60) {
		const h = Math.floor(diffMins / 60);
		const m = diffMins % 60;
		return `in ${h}h${m > 0 ? ` ${m}m` : ''}`;
	}
	const d = date.getDate();
	const mon = MONTHS[date.getMonth()];
	const timeStr = formatTime(`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`);
	if (date.toDateString() === now.toDateString()) return `Today at ${timeStr}`;
	const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
	if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${timeStr}`;
	return `${mon} ${d} at ${timeStr}`;
}
