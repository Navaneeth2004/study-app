<script lang="ts">
	import { goto } from '$app/navigation';
	import { logout, getCurrentUser } from '$lib/auth/authService';

	interface Props {
		onMenuToggle: () => void;
	}

	let { onMenuToggle }: Props = $props();

	const user = getCurrentUser();

	function handleLogout() {
		logout();
		goto('/auth/login');
	}
</script>

<header
	class="fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between
	       border-b border-[var(--color-surface-700)] bg-[var(--color-surface-900)]/95
	       px-4 backdrop-blur-sm lg:left-64"
>
	<!-- Mobile menu toggle -->
	<button
		onclick={onMenuToggle}
		aria-label="Toggle menu"
		class="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)]
		       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
		       transition-colors lg:hidden"
	>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
			<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	<!-- Spacer on desktop -->
	<div class="hidden lg:block"></div>

	<!-- Right side -->
	<div class="flex items-center gap-3">
		{#if user}
			<span class="text-sm text-[var(--color-text-secondary)]">
				{user.name || user.email}
			</span>
		{/if}

		<button
			onclick={handleLogout}
			class="flex items-center gap-2 rounded-lg border border-[var(--color-surface-600)]
			       px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors
			       hover:border-[var(--color-surface-500)] hover:text-[var(--color-text-primary)]"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
			</svg>
			Log out
		</button>
	</div>
</header>