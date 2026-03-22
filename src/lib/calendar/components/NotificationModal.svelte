<script lang="ts">
	import type { StudyNotification, NotificationForm, ScheduleType } from '$lib/notifications/notificationTypes';
	import IconPicker from '$lib/notifications/components/IconPicker.svelte';
	import ColorSwatchPicker from '$lib/notifications/components/ColorSwatchPicker.svelte';
	import TimeListEditor from '$lib/notifications/components/TimeListEditor.svelte';
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';

	interface Props {
		notification?: StudyNotification | null;
		presetColors: string[];
		onSave: (form: NotificationForm) => Promise<void>;
		onClose: () => void;
	}

	let { notification = null, presetColors, onSave, onClose }: Props = $props();

	const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

	let title = $state(notification?.title ?? '');
	let body = $state(notification?.body ?? '');
	let icon = $state(notification?.icon ?? 'study');
	let color = $state(notification?.color ?? '#6c63ff');
	let scheduleType = $state<ScheduleType>(notification?.scheduleType ?? 'daily');
	let scheduledDate = $state('');
	let scheduledTime = $state('09:00');
	let dailyTimes = $state<string[]>(notification?.dailyTimes ? [...notification.dailyTimes] : ['08:00']);
	let weeklyDays = $state<number[]>(notification?.weeklyDays ? [...notification.weeklyDays] : []);
	let weeklyTimes = $state<string[]>(notification?.weeklyTimes ? [...notification.weeklyTimes] : ['08:00']);
	let isActive = $state(notification?.isActive ?? true);
	let saving = $state(false);
	let error = $state('');
	let showUnsaved = $state(false);

	// Parse scheduledAt into date + time
	if (notification?.scheduledAt) {
		const d = new Date(notification.scheduledAt);
		scheduledDate = d.toISOString().slice(0, 10);
		scheduledTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
	}

	const isDirty = $derived(
		title !== (notification?.title ?? '') ||
		body !== (notification?.body ?? '') ||
		icon !== (notification?.icon ?? 'study') ||
		color !== (notification?.color ?? '#6c63ff')
	);

	function toggleDay(d: number) {
		weeklyDays = weeklyDays.includes(d) ? weeklyDays.filter((x) => x !== d) : [...weeklyDays, d];
	}
	function attemptClose() { if (isDirty) { showUnsaved = true; } else { onClose(); } }

	async function handleSave() {
		if (!title.trim()) { error = 'Title is required.'; return; }
		if (scheduleType === 'weekly' && weeklyDays.length === 0) { error = 'Select at least one day.'; return; }
		saving = true; error = '';
		try {
			await onSave({
				title: title.trim(), body: body.trim(), icon, color,
				scheduleType, scheduledAt: scheduledDate, scheduledTime,
				dailyTimes: dailyTimes.filter(Boolean), weeklyDays, weeklyTimes: weeklyTimes.filter(Boolean), isActive
			});
			onClose();
		} catch (e) { error = e instanceof Error ? e.message : 'Could not save.'; }
		finally { saving = false; }
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70" onclick={attemptClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-950)] shadow-2xl"
	     onclick={(e) => e.stopPropagation()}>

		<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4">
			<span class="text-sm font-semibold text-[var(--color-text-primary)]">{notification ? 'Edit Notification' : 'New Notification'}</span>
			<button onclick={attemptClose} aria-label="Close"
				class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
				       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>

		<div class="flex flex-col gap-4 p-5">
			<div class="flex flex-col gap-1.5">
				<label for="notif-title" class="text-xs font-medium text-[var(--color-text-secondary)]">Title *</label>
				<input id="notif-title" type="text" bind:value={title} placeholder="e.g. Time to study!"
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
					       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="notif-body" class="text-xs font-medium text-[var(--color-text-secondary)]">Body (optional)</label>
				<input id="notif-body" type="text" bind:value={body} placeholder="Subtext shown in the notification"
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
					       px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-[var(--color-text-secondary)]">Icon</span>
				<IconPicker selectedKey={icon} onSelect={(k) => (icon = k)} />
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-[var(--color-text-secondary)]">Colour</span>
				<ColorSwatchPicker selectedColor={color} onSelect={(c) => (color = c)} colors={presetColors} />
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-[var(--color-text-secondary)]">Schedule</span>
				<div class="flex gap-2">
					{#each (['once', 'daily', 'weekly'] as ScheduleType[]) as st}
						<button onclick={() => (scheduleType = st)}
							class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
							       {scheduleType === st ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]' : 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
							{st}
						</button>
					{/each}
				</div>
			</div>

			{#if scheduleType === 'once'}
				<div class="flex gap-3 flex-wrap">
					<div class="flex flex-col gap-1.5">
						<label for="notif-date" class="text-xs font-medium text-[var(--color-text-secondary)]">Date</label>
						<input id="notif-date" type="date" bind:value={scheduledDate}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="notif-time" class="text-xs font-medium text-[var(--color-text-secondary)]">Time</label>
						<input id="notif-time" type="time" bind:value={scheduledTime}
							class="rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
					</div>
				</div>
			{:else if scheduleType === 'daily'}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-[var(--color-text-secondary)]">Times</span>
					<TimeListEditor times={dailyTimes} onChange={(t) => (dailyTimes = t)} />
				</div>
			{:else}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-[var(--color-text-secondary)]">Days</span>
					<div class="flex flex-wrap gap-1.5">
						{#each DOW as label, i}
							<button onclick={() => toggleDay(i)}
								class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
								       {weeklyDays.includes(i) ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]' : 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}">
								{label}
							</button>
						{/each}
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-[var(--color-text-secondary)]">Times</span>
					<TimeListEditor times={weeklyTimes} onChange={(t) => (weeklyTimes = t)} />
				</div>
			{/if}

			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={isActive} class="accent-[var(--color-accent-500)]" />
				<span class="text-sm text-[var(--color-text-secondary)]">Active</span>
			</label>

			{#if error}<p class="text-xs text-[var(--color-error-400)]">{error}</p>{/if}

			<div class="flex gap-3 pt-1">
				<button onclick={handleSave} disabled={saving || !title.trim()}
					class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm font-medium text-white
					       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{saving ? 'Saving…' : 'Save'}
				</button>
				<button onclick={attemptClose}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
</div>

<UnsavedChangesModal
	isOpen={showUnsaved}
	{saving}
	onSave={handleSave}
	onLeave={() => { showUnsaved = false; onClose(); }}
	onStay={() => (showUnsaved = false)}
/>
