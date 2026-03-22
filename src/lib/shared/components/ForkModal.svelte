<script lang="ts">
	interface Props {
		isOpen: boolean;
		contentType: 'textbook' | 'category';
		originalTitle: string;
		originalAuthor: string;
		onConfirm: (newTitle: string) => void;
		onClose: () => void;
	}

	let { isOpen, contentType, originalTitle, originalAuthor, onConfirm, onClose }: Props = $props();

	let newTitle = $state(originalTitle);

	$effect(() => {
		if (isOpen) newTitle = originalTitle;
	});

	function handleConfirm() {
		if (!newTitle.trim()) return;
		onConfirm(newTitle.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleConfirm();
		if (e.key === 'Escape') onClose();
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.7);" onclick={onClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="relative w-full max-w-md rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] p-6 shadow-2xl flex flex-col gap-5"
		     onclick={(e) => e.stopPropagation()}>
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-col gap-1">
					<h2 class="font-display text-xl text-[var(--color-text-primary)]">
						Duplicate to your library
					</h2>
					<p class="text-sm text-[var(--color-text-secondary)]">
						Creating your own copy of <span class="font-medium text-[var(--color-text-primary)]">{originalTitle}</span>
						{#if originalAuthor}by <span class="text-[var(--color-accent-400)]">{originalAuthor}</span>{/if}
					</p>
				</div>
				<button onclick={onClose} aria-label="Close"
					class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg
					       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
					       hover:text-[var(--color-text-primary)] transition-colors">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="fork-title" class="text-sm font-medium text-[var(--color-text-secondary)]">
					Name your copy
				</label>
				<input
					id="fork-title"
					type="text"
					bind:value={newTitle}
					onkeydown={handleKeydown}
					placeholder={originalTitle}
					class="w-full rounded-xl border border-[var(--color-surface-600)]
					       bg-[var(--color-surface-800)] px-4 py-3 text-sm
					       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-accent-500)] focus:outline-none
					       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
				/>
			</div>

			<p class="text-xs text-[var(--color-text-muted)] rounded-xl border border-[var(--color-surface-700)]
			          bg-[var(--color-surface-900)] px-4 py-3">
				You will be able to edit, share and export this copy. The original will not be affected.
			</p>

			<div class="flex gap-3">
				<button onclick={handleConfirm} disabled={!newTitle.trim()}
					class="flex-1 rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium
					       text-white hover:bg-[var(--color-accent-400)]
					       disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
					Duplicate
				</button>
				<button onclick={onClose}
					class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
