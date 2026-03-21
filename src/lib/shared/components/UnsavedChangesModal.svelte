<script lang="ts">
	interface Props {
		isOpen: boolean;
		saving?: boolean;
		zClass?: string;
		onSave: () => Promise<void>;
		onLeave: () => void;
		onStay: () => void;
	}

	let { isOpen, saving = false, zClass = 'z-50', onSave, onLeave, onStay }: Props = $props();

	async function handleSaveAndLeave() {
		await onSave();
		onLeave();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 {zClass} flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/70" aria-hidden="true"></div>

		<!-- Modal -->
		<div
			class="relative w-full max-w-sm rounded-2xl border border-[var(--color-surface-700)]
			       bg-[var(--color-surface-900)] p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
		>
			<div class="flex flex-col gap-5">
				<div class="flex flex-col gap-1.5">
					<h2 class="font-display text-lg text-[var(--color-text-primary)]">Unsaved changes</h2>
					<p class="text-sm text-[var(--color-text-secondary)]">
						You have unsaved changes. Save before leaving?
					</p>
				</div>

				<div class="flex flex-col gap-2">
					<button
						onclick={handleSaveAndLeave}
						disabled={saving}
						class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium
						       text-[var(--color-text-primary)] hover:bg-[var(--color-accent-400)] disabled:opacity-50
						       disabled:cursor-not-allowed transition-colors"
					>
						{saving ? 'Saving…' : 'Save and leave'}
					</button>
					<button
						onclick={onLeave}
						disabled={saving}
						class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5
						       text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
						       disabled:opacity-50 transition-colors"
					>
						Leave without saving
					</button>
					<button
						onclick={onStay}
						disabled={saving}
						class="w-full px-4 py-2 text-sm text-[var(--color-text-muted)]
						       hover:text-[var(--color-text-secondary)] transition-colors"
					>
						Stay
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
