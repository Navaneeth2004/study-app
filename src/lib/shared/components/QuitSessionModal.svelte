<script lang="ts">
	interface Props {
		isOpen: boolean;
		title?: string;
		message?: string;
		onQuit: () => void;
		onStay: () => void;
	}
	let { isOpen, title = 'Quit session?', message = 'Your progress will be lost.', onQuit, onStay }: Props = $props();
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.75);" onclick={onStay}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-6 shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="flex flex-col gap-1.5">
				<h2 class="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">{message}</p>
			</div>
			<div class="flex flex-col gap-2">
				<button onclick={onQuit}
					class="w-full rounded-xl bg-[var(--color-error-500)]/15 px-4 py-2.5 text-sm font-medium
					       text-[var(--color-error-400)] hover:bg-[var(--color-error-500)]/25 transition-colors">
					Yes, quit
				</button>
				<button onclick={onStay}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Keep going
				</button>
			</div>
		</div>
	</div>
{/if}
