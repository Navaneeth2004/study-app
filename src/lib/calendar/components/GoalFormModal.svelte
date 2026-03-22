<script lang="ts">
	import UnsavedChangesModal from '$lib/shared/components/UnsavedChangesModal.svelte';
	import type { StudyGoal, GoalType } from '$lib/calendar/calendarTypes';

	export interface GoalFormData {
		title: string;
		type: GoalType;
		targetMinutes: number | null;
		targetDaysOfWeek: number[] | null;
		targetDays: string[] | null;
		startDate: string;
		endDate: string | null;
	}

	interface Props {
		isOpen: boolean;
		editingGoal: StudyGoal | null; // null = new goal
		saving?: boolean;
		error?: string;
		onSave: (data: GoalFormData) => Promise<void>;
		onClose: () => void;
	}

	let { isOpen, editingGoal, saving = false, error = '', onSave, onClose }: Props = $props();

	const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// Form state — reset when modal opens
	let gTitle = $state('');
	let gType = $state<GoalType>('daily');
	let gTargetMinutes = $state('');
	let gDaysOfWeek = $state<number[]>([]);
	let gCustomDates = $state<string[]>([]);
	let gCustomDateInput = $state('');
	let gStartDate = $state(todayStr());
	let gHasEndDate = $state(false);
	let gEndDate = $state('');
	let formError = $state('');
	let showDiscardGuard = $state(false);

	// Track whether form is dirty
	let isDirty = $state(false);

	$effect(() => {
		if (isOpen) {
			// Reset to editing goal or blank
			gTitle = editingGoal?.title ?? '';
			gType = editingGoal?.type ?? 'daily';
			gTargetMinutes = editingGoal?.targetMinutes ? String(editingGoal.targetMinutes) : '';
			gDaysOfWeek = editingGoal?.targetDaysOfWeek ? [...editingGoal.targetDaysOfWeek] : [];
			gCustomDates = editingGoal?.targetDays ? [...editingGoal.targetDays] : [];
			gCustomDateInput = '';
			gStartDate = editingGoal?.startDate ?? todayStr();
			gHasEndDate = !!editingGoal?.endDate;
			gEndDate = editingGoal?.endDate ?? '';
			formError = '';
			isDirty = false;
		}
	});

	// Mark dirty on any field change after open
	function markDirty() { isDirty = true; }

	function attemptClose() {
		if (isDirty) showDiscardGuard = true;
		else onClose();
	}

	function addCustomDate() {
		const d = gCustomDateInput.trim();
		if (d && !gCustomDates.includes(d)) gCustomDates = [...gCustomDates, d].sort();
		gCustomDateInput = '';
		markDirty();
	}

	function removeCustomDate(d: string) {
		gCustomDates = gCustomDates.filter((x) => x !== d);
		markDirty();
	}

	function toggleDow(d: number) {
		gDaysOfWeek = gDaysOfWeek.includes(d)
			? gDaysOfWeek.filter((x) => x !== d)
			: [...gDaysOfWeek, d];
		markDirty();
	}

	async function handleSave() {
		if (!gTitle.trim()) { formError = 'Title is required.'; return; }
		if (gType === 'weekly' && gDaysOfWeek.length === 0) { formError = 'Select at least one day.'; return; }
		if (gType === 'custom' && gCustomDates.length === 0) { formError = 'Add at least one date.'; return; }
		formError = '';
		await onSave({
			title: gTitle.trim(),
			type: gType,
			targetMinutes: gTargetMinutes ? parseInt(gTargetMinutes) : null,
			targetDaysOfWeek: gType === 'weekly' ? gDaysOfWeek : null,
			targetDays: gType === 'custom' ? gCustomDates : null,
			startDate: gStartDate,
			endDate: gHasEndDate && gEndDate ? gEndDate : null
		});
		// onClose called by parent after successful save
	}
</script>

<!-- Discard guard (z-[60] sits above this modal at z-50) -->
<UnsavedChangesModal
	isOpen={showDiscardGuard}
	zClass="z-[60]"
	saving={false}
	onSave={async () => { showDiscardGuard = false; }}
	onLeave={() => { showDiscardGuard = false; isDirty = false; onClose(); }}
	onStay={() => (showDiscardGuard = false)}
/>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.7);"
		onclick={attemptClose}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border
			       border-[var(--color-surface-700)] bg-[var(--color-surface-950)] shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal header -->
			<div class="flex items-center justify-between border-b border-[var(--color-surface-700)] px-5 py-4 sticky top-0 bg-[var(--color-surface-950)] z-10">
				<span class="text-sm font-semibold text-[var(--color-text-secondary)]">
					{editingGoal ? 'Edit Goal' : 'New Goal'}
				</span>
				<button
					onclick={attemptClose}
					aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)]
					       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="flex flex-col gap-4 p-5">
				<!-- Title -->
				<div class="flex flex-col gap-1.5">
					<label for="goal-title" class="text-xs font-medium text-[var(--color-text-secondary)]">Title</label>
					<input
						id="goal-title"
						type="text"
						bind:value={gTitle}
						oninput={markDirty}
						placeholder="e.g. Study 1 hour daily"
						class="w-full rounded-xl border border-[var(--color-surface-600)]
						       bg-[var(--color-surface-800)] px-3 py-2 text-sm
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
					/>
				</div>

				<!-- Type -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-[var(--color-text-secondary)]">Type</span>
					<div class="flex gap-2">
						{#each (['daily', 'weekly', 'custom'] as GoalType[]) as t}
							<button
								onclick={() => { gType = t; markDirty(); }}
								class="rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors
								       {gType === t
									? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
									: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
							>
								{t}
							</button>
						{/each}
					</div>
				</div>

				<!-- Minimum minutes (daily + weekly only) -->
				{#if gType === 'daily' || gType === 'weekly'}
					<div class="flex flex-col gap-1.5">
						<label for="goal-minutes" class="text-xs font-medium text-[var(--color-text-secondary)]">
							Minimum minutes to count as done (optional)
						</label>
						<input
							id="goal-minutes"
							type="number"
							bind:value={gTargetMinutes}
							oninput={markDirty}
							min={1}
							placeholder="e.g. 60"
							class="w-28 rounded-xl border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-3 py-2 text-sm
							       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
						/>
					</div>
				{/if}

				<!-- Days of week (weekly only) -->
				{#if gType === 'weekly'}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-[var(--color-text-secondary)]">Days of the week</span>
						<div class="flex flex-wrap gap-2">
							{#each DOW_LABELS as dow, i}
								<button
									onclick={() => toggleDow(i)}
									class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
									       {gDaysOfWeek.includes(i)
										? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
										: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
								>
									{dow}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Custom dates -->
				{#if gType === 'custom'}
					<div class="flex flex-col gap-2">
						<span class="text-xs font-medium text-[var(--color-text-secondary)]">Target dates</span>
						<div class="flex gap-2">
							<input
								type="date"
								bind:value={gCustomDateInput}
								oninput={markDirty}
								class="rounded-xl border border-[var(--color-surface-600)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm
								       text-[var(--color-text-primary)]
								       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
							/>
							<button
								onclick={addCustomDate}
								disabled={!gCustomDateInput}
								class="rounded-xl border border-[var(--color-surface-600)] px-3 py-2 text-sm
								       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
								       disabled:opacity-40 transition-colors"
							>
								Add
							</button>
						</div>
						{#if gCustomDates.length > 0}
							<div class="flex flex-wrap gap-1.5">
								{#each gCustomDates as d}
									<span class="flex items-center gap-1 rounded-lg bg-[var(--color-surface-800)]
									             border border-[var(--color-surface-600)] px-2 py-1 text-xs
									             text-[var(--color-text-secondary)]">
										{d}
										<button
											onclick={() => removeCustomDate(d)}
											aria-label="Remove {d}"
											class="text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors"
										>
											<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
												<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
											</svg>
										</button>
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Start / end date -->
				<div class="flex gap-4 flex-wrap">
					<div class="flex flex-col gap-1.5">
						<label for="goal-start" class="text-xs font-medium text-[var(--color-text-secondary)]">Start date</label>
						<input
							id="goal-start"
							type="date"
							bind:value={gStartDate}
							oninput={markDirty}
							class="rounded-xl border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-3 py-2 text-sm
							       text-[var(--color-text-primary)]
							       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer">
							<input
								type="checkbox"
								bind:checked={gHasEndDate}
								onchange={markDirty}
								class="accent-[var(--color-accent-500)]"
							/>
							End date
						</label>
						{#if gHasEndDate}
							<input
								id="goal-end"
								type="date"
								bind:value={gEndDate}
								oninput={markDirty}
								class="rounded-xl border border-[var(--color-surface-600)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm
								       text-[var(--color-text-primary)]
								       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"
							/>
						{/if}
					</div>
				</div>

				{#if formError || error}
					<p class="text-xs text-[var(--color-error-400)]">{formError || error}</p>
				{/if}

				<!-- Actions -->
				<div class="flex gap-3 pt-1">
					<button
						onclick={handleSave}
						disabled={saving}
						class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium
						       text-white hover:bg-[var(--color-accent-400)]
						       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{saving ? 'Saving…' : editingGoal ? 'Save changes' : 'Create goal'}
					</button>
					<button
						onclick={attemptClose}
						disabled={saving}
						class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
						       disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
