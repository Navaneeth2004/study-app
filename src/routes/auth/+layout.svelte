<script lang="ts">
	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<main class="flex min-h-screen items-center justify-center bg-[var(--color-surface-950)] px-4">
	<div class="relative w-full max-w-md">
		<!-- Ambient glow behind card -->
		<div
			class="pointer-events-none absolute -inset-px rounded-2xl opacity-30
			       blur-2xl bg-[var(--color-accent-500)]"
			aria-hidden="true"
		></div>

		<div
			class="relative rounded-2xl border border-[var(--color-surface-700)]
			       bg-[var(--color-surface-900)] p-8 shadow-2xl"
		>
			<!-- Brand -->
			<div class="mb-8 flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl
					       bg-[var(--color-accent-500)]"
				>
					<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M3 4.5h12M3 9h8M3 13.5h5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
					</svg>
				</div>
				<span
					class="font-display text-lg font-normal tracking-tight text-[var(--color-text-primary)]"
				>
					StudyApp
				</span>
			</div>

			{@render children()}
		</div>
	</div>
</main>