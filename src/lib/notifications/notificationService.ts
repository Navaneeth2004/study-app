import { pb } from '$lib/shared/pocketbase';
import { ClientResponseError } from 'pocketbase';
import type { StudyNotification, NotificationForm, NotificationPermissionStatus } from './notificationTypes';
import { getNextFireTime } from './notificationUtils';

// ── Module-scope timeout tracking ─────────────────────────────────────────────
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function toNotification(r: Record<string, unknown>): StudyNotification {
	return {
		id: r.id as string,
		user: r.user as string,
		title: r.title as string,
		body: (r.body as string) ?? '',
		icon: r.icon as string,
		color: r.color as string,
		scheduleType: r.scheduleType as StudyNotification['scheduleType'],
		scheduledAt: (r.scheduledAt as string) || null,
		dailyTimes: r.dailyTimes ? (Array.isArray(r.dailyTimes) ? r.dailyTimes : JSON.parse(r.dailyTimes as string)) : null,
		weeklyDays: r.weeklyDays ? (Array.isArray(r.weeklyDays) ? r.weeklyDays : JSON.parse(r.weeklyDays as string)) : null,
		weeklyTimes: r.weeklyTimes ? (Array.isArray(r.weeklyTimes) ? r.weeklyTimes : JSON.parse(r.weeklyTimes as string)) : null,
		isActive: (r.isActive as boolean) ?? true,
		lastFiredAt: (r.lastFiredAt as string) || null,
		created: r.created as string
	};
}

// ── PocketBase CRUD ───────────────────────────────────────────────────────────

export async function listNotifications(): Promise<StudyNotification[]> {
	try {
		const records = await pb.collection('notifications').getFullList({
			requestKey: null,
			filter: `user = "${pb.authStore.record?.id}"`,
			sort: 'created'
		});
		return records.map(toNotification);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function createNotification(form: NotificationForm): Promise<StudyNotification> {
	try {
		const uid = pb.authStore.record?.id ?? '';
		let scheduledAt = '';
		if (form.scheduleType === 'once' && form.scheduledAt && form.scheduledTime) {
			scheduledAt = new Date(`${form.scheduledAt}T${form.scheduledTime}`).toISOString();
		}
		const r = await pb.collection('notifications').create({
			user: uid,
			title: form.title,
			body: form.body,
			icon: form.icon,
			color: form.color,
			scheduleType: form.scheduleType,
			scheduledAt: scheduledAt || null,
			dailyTimes: form.scheduleType === 'daily' ? form.dailyTimes : null,
			weeklyDays: form.scheduleType === 'weekly' ? form.weeklyDays : null,
			weeklyTimes: form.scheduleType === 'weekly' ? form.weeklyTimes : null,
			isActive: form.isActive
		});
		return toNotification(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateNotification(id: string, form: NotificationForm): Promise<StudyNotification> {
	try {
		let scheduledAt = '';
		if (form.scheduleType === 'once' && form.scheduledAt && form.scheduledTime) {
			scheduledAt = new Date(`${form.scheduledAt}T${form.scheduledTime}`).toISOString();
		}
		const r = await pb.collection('notifications').update(id, {
			title: form.title,
			body: form.body,
			icon: form.icon,
			color: form.color,
			scheduleType: form.scheduleType,
			scheduledAt: scheduledAt || null,
			dailyTimes: form.scheduleType === 'daily' ? form.dailyTimes : null,
			weeklyDays: form.scheduleType === 'weekly' ? form.weeklyDays : null,
			weeklyTimes: form.scheduleType === 'weekly' ? form.weeklyTimes : null,
			isActive: form.isActive
		});
		return toNotification(r);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function deleteNotification(id: string): Promise<void> {
	try {
		await pb.collection('notifications').delete(id);
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function toggleActive(id: string, isActive: boolean): Promise<void> {
	try {
		await pb.collection('notifications').update(id, { isActive });
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function updateLastFired(id: string): Promise<void> {
	try {
		await pb.collection('notifications').update(id, { lastFiredAt: new Date().toISOString() });
	} catch { /* best-effort */ }
}

/** Create an in-app notification when a study reminder fires */
async function createInAppStudyReminder(notification: StudyNotification): Promise<void> {
	const uid = pb.authStore.record?.id;
	if (!uid) return;
	try {
		await pb.collection('in_app_notifications').create({
			user: uid,
			type: 'study_reminder',
			title: `🔔 ${notification.title}`,
			body: notification.body || '',
			relatedContentType: '',
			relatedContentId: '',
			relatedUserId: '',
			relatedUserName: '',
			isRead: false
		}, { requestKey: null });
	} catch { /* fire-and-forget */ }
}

// ── Browser Notification / Web Push ──────────────────────────────────────────

export function getPermissionStatus(): NotificationPermissionStatus {
	if (typeof Notification === 'undefined') return 'denied';
	return Notification.permission as NotificationPermissionStatus;
}

export async function requestPermission(): Promise<NotificationPermissionStatus> {
	if (typeof Notification === 'undefined') return 'denied';
	const result = await Notification.requestPermission();
	return result as NotificationPermissionStatus;
}

export function fireNotification(notification: StudyNotification): void {
	if (typeof Notification === 'undefined') return;
	if (Notification.permission !== 'granted') return;
	try {
		new Notification(notification.title, {
			body: notification.body || undefined,
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			tag: notification.id,
			data: { color: notification.color }
		});
		updateLastFired(notification.id);
		// Also create in-app notification so it shows in the sidebar
		createInAppStudyReminder(notification);
	} catch (e) {
		console.warn('Failed to fire notification:', e);
	}
}

export function cancelScheduled(notificationId: string): void {
	const timer = pending.get(notificationId);
	if (timer !== undefined) {
		clearTimeout(timer);
		pending.delete(notificationId);
	}
}

export function scheduleNotification(notification: StudyNotification): void {
	cancelScheduled(notification.id);
	if (!notification.isActive) return;
	if (Notification.permission !== 'granted') return;

	const next = getNextFireTime(notification);
	if (!next) return;

	const msUntil = next.getTime() - Date.now();
	if (msUntil < 0) return;

	// Only schedule if within 25 hours (setTimeout has ~24h limit in practice)
	if (msUntil > 25 * 60 * 60 * 1000) return;

	const timer = setTimeout(() => {
		fireNotification(notification);
		pending.delete(notification.id);
		// For recurring, reschedule after firing
		if (notification.scheduleType !== 'once') {
			setTimeout(() => scheduleNotification(notification), 61_000); // wait 61s then reschedule
		}
	}, msUntil);

	pending.set(notification.id, timer);
}

export function scheduleAll(notifications: StudyNotification[]): void {
	// Cancel all existing timers first
	for (const id of pending.keys()) cancelScheduled(id);
	// Reschedule active ones
	for (const n of notifications) {
		if (n.isActive) scheduleNotification(n);
	}
}
