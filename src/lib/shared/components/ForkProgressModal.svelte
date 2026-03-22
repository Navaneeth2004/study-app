<script lang="ts">
	import { onMount } from 'svelte';
	import type { ForkProgress } from '$lib/sharing/forkTypes';

	interface Props {
		isOpen: boolean;
		progress: ForkProgress | null;
		error: string | null;
		onDone: () => void;
	}

	let { isOpen, progress, error, onDone }: Props = $props();

	const isDone = $derived(
		progress !== null && progress.step >= progress.total && progress.total > 0 && !error
	);

	const pct = $derived(
		progress && progress.total > 0
			? Math.round((progress.step / progress.total) * 100)
			: 0
	);

	// Auto-navigate 1.2s after done so user sees the completion state briefly
	$effect(() => {
		if (isDone) {
			const t = setTimeout(() => onDone(), 1200);
			return () => clearTimeout(t);
		}
	});
</script>

{#if isOpen}
	<!-- Not dismissible during progress -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4"
	     style="background: rgba(0,0,0,0.75);">
		<div class="relative w-full max-w-sm rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-950)] p-6 shadow-2xl flex flex-col gap-5">

			{#if error}
				<div class="flex flex-col gap-3">
					<h2 class="font-display text-xl text-[var(--color-text-primary)]">Something went wrong</h2>
					<p class="text-sm text-[var(--color-error-400)]">{error}</p>
					<button onclick={onDone}
						class="self-start rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
						       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Close
					</button>
				</div>

			{:else if isDone}
				<div class="flex flex-col gap-3 text-center items-center">
					<div class="flex h-12 w-12 items-center justify-center rounded-full"
					     style="background: color-mix(in srgb, var(--color-success-500) 15%, transparent);">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						     stroke-width="2.5" stroke-linecap="round"
						     style="color: var(--color-success-500);">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
					</div>
					<h2 class="font-display text-xl text-[var(--color-text-primary)]">Done!</h2>
					<p class="text-sm text-[var(--color-text-secondary)]">
						Your copy is ready. Taking you there…
					</p>
				</div>

			{:else}
				<div class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<svg class="animate-spin shrink-0" width="18" height="18" viewBox="0 0 24 24"
						     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
						     style="color: var(--color-accent-400);">
							<path d="M21 12a9 9 0 11-6.219-8.56"/>
						</svg>
						<h2 class="text-base font-semibold text-[var(--color-text-primary)]">
							Duplicating content…
						</h2>
					</div>
					<div class="flex flex-col gap-1.5">
						<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-700)]">
							<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300"
							     style="width: {pct}%;"></div>
						</div>
						<div class="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
							<span>{progress?.message ?? 'Starting…'}</span>
							<span>{pct}%</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
