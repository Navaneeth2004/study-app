<script lang="ts">
	import { getCurrentUser } from '$lib/auth/authService';

	const user = getCurrentUser();
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
		Account
	</h2>

	<div
		class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]
		       divide-y divide-[var(--color-surface-700)]"
	>
		<div class="flex items-center justify-between px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-[var(--color-text-muted)]">Name</span>
				<span class="text-sm text-[var(--color-text-primary)]">{user?.name || '—'}</span>
			</div>
		</div>
		<div class="flex items-center justify-between px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-[var(--color-text-muted)]">Email</span>
				<span class="text-sm text-[var(--color-text-primary)]">{user?.email || '—'}</span>
			</div>
		</div>
	</div>
</section>