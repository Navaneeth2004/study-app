export interface NotificationIcon {
	key: string;
	emoji: string;
	label: string;
}

export const NOTIFICATION_ICONS: NotificationIcon[] = [
	{ key: 'study',    emoji: '📚', label: 'Study'    },
	{ key: 'music',    emoji: '🎵', label: 'Music'    },
	{ key: 'practice', emoji: '🎹', label: 'Practice' },
	{ key: 'reminder', emoji: '⏰', label: 'Reminder' },
	{ key: 'goal',     emoji: '🎯', label: 'Goal'     },
	{ key: 'streak',   emoji: '🔥', label: 'Streak'   },
	{ key: 'break',    emoji: '☕', label: 'Break'    },
	{ key: 'focus',    emoji: '🧠', label: 'Focus'    },
	{ key: 'workout',  emoji: '💪', label: 'Workout'  },
	{ key: 'sleep',    emoji: '😴', label: 'Sleep'    },
	{ key: 'custom',   emoji: '✏️', label: 'Custom'   },
];

export function getIcon(key: string): NotificationIcon {
	return NOTIFICATION_ICONS.find((i) => i.key === key) ?? NOTIFICATION_ICONS[0];
}
