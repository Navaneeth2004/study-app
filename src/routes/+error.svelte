<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>404 — Page Not Found</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[var(--color-surface-950)] px-4">
	<div class="flex flex-col items-center gap-8 text-center max-w-md">

		<!-- Animated illustration -->
		<div class="relative">
			<div class="absolute inset-0 rounded-full blur-3xl opacity-20"
			     style="background: var(--color-accent-500); width: 200px; height: 200px; left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>
			<div class="relative flex h-36 w-36 items-center justify-center rounded-2xl border border-[var(--color-surface-700)]"
			     style="background: color-mix(in srgb, var(--color-accent-500) 8%, var(--color-surface-900));">
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				     stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"
				     style="color: var(--color-accent-400);">
					<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
					<polyline points="14 2 14 8 20 8"/>
					<line x1="12" y1="12" x2="12" y2="16"/>
					<line x1="12" y1="10" x2="12.01" y2="10"/>
				</svg>
			</div>
		</div>

		<!-- Error code -->
		<div class="flex flex-col gap-3">
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent-400)]">
				Error 404
			</p>
			<h1 class="font-display text-4xl text-[var(--color-text-primary)]">
				Page not found
			</h1>
			<p class="text-[var(--color-text-secondary)] leading-relaxed">
				This page doesn't exist or has been moved. Let's get you back to studying.
			</p>
		</div>

		<!-- Actions -->
		<div class="flex flex-col gap-3 w-full">
			<button
				onclick={() => goto('/viewer')}
				class="w-full rounded-xl bg-[var(--color-accent-500)] px-6 py-3 font-medium text-white
				       hover:bg-[var(--color-accent-400)] transition-colors"
			>
				Go to Home
			</button>
			<button
				onclick={() => history.back()}
				class="w-full rounded-xl border border-[var(--color-surface-600)] px-6 py-3 text-sm
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
				       hover:border-[var(--color-surface-500)] transition-colors"
			>
				Go back
			</button>
		</div>

		<!-- Quick links -->
		<div class="flex flex-col gap-2 w-full border-t border-[var(--color-surface-700)] pt-6">
			<p class="text-xs text-[var(--color-text-muted)]">Or go directly to</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#each [
					{ label: 'Textbooks', href: '/viewer' },
					{ label: 'Flashcards', href: '/viewer/flashcards' },
					{ label: 'Review', href: '/review' },
					{ label: 'Calendar', href: '/calendar' },
					{ label: 'Search', href: '/viewer/search' }
				] as link}
					<a href={link.href}
					   class="rounded-lg border border-[var(--color-surface-700)] px-3 py-1.5 text-xs
					          text-[var(--color-text-secondary)] hover:text-[var(--color-accent-400)]
					          hover:border-[var(--color-accent-500)]/50 transition-colors">
						{link.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
</main>
