<script lang="ts">
	import { pb } from '$lib/shared/pocketbase';
	import { getCurrentUser, logout } from '$lib/auth/authService';
	import { goto } from '$app/navigation';

	const user = getCurrentUser();

	// Step 0: hidden, Step 1: first confirm modal, Step 2: final confirm with email
	let step = $state<0 | 1 | 2>(0);
	let confirmEmail = $state('');
	let deleting = $state(false);
	let deleteError = $state('');

	async function handleDelete() {
		if (confirmEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()) {
			deleteError = 'Email does not match. Please try again.';
			return;
		}
		deleting = true; deleteError = '';
		try {
			// Delete all follows for this user first
			const uid = user?.id as string;
			const myFollows = await pb.collection('follows').getFullList({
				requestKey: null,
				filter: `follower = "${uid}" || following = "${uid}"`,
				fields: 'id'
			});
			await Promise.all(myFollows.map((f) => pb.collection('follows').delete(f.id as string, { requestKey: null })));
			// Delete account
			await pb.collection('users').delete(uid);
			logout();
			goto('/auth/login');
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Could not delete account.';
			deleting = false;
		}
	}

	function reset() {
		step = 0; confirmEmail = ''; deleteError = '';
	}
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
		Account
	</h2>

	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)]
	            divide-y divide-[var(--color-surface-700)]">
		<div class="flex items-center justify-between px-5 py-4">
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-[var(--color-text-muted)]">Email</span>
				<span class="text-sm text-[var(--color-text-primary)]">{user?.email || '—'}</span>
			</div>
		</div>
		<div class="flex items-center justify-between px-5 py-4">
			<span class="text-sm text-[var(--color-text-secondary)]">Manage name, avatar, bio, social links</span>
			<a href="/profile"
			   class="text-sm text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors">
				Edit profile →
			</a>
		</div>
		<div class="px-5 py-4">
			<button onclick={() => (step = 1)}
				class="text-sm text-[var(--color-error-400)] hover:underline transition-colors">
				Delete account
			</button>
		</div>
	</div>
</section>

<!-- Step 1: First confirmation -->
{#if step === 1}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex flex-col gap-2">
				<div class="flex h-11 w-11 items-center justify-center rounded-full
				            bg-[var(--color-error-500)]/15">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
					     class="text-[var(--color-error-400)]">
						<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
						<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
					</svg>
				</div>
				<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Delete your account?</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">
					This will permanently delete your account. Your shared content will remain available but show as "Anonymous".
					<strong class="text-[var(--color-text-primary)]">This cannot be undone.</strong>
				</p>
			</div>
			<div class="flex flex-col gap-2">
				<button onclick={() => (step = 2)}
					class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium
					       text-white hover:bg-[var(--color-error-400)] transition-colors">
					Yes, I want to delete my account
				</button>
				<button onclick={reset}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Step 2: Final confirmation with email -->
{#if step === 2}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-error-500)]/40
		            bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex flex-col gap-2">
				<h2 class="text-base font-semibold text-[var(--color-error-400)]">Final confirmation</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">
					Type your email address to permanently delete your account:
				</p>
				<p class="text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-800)]
				          rounded-lg px-3 py-1.5">{user?.email}</p>
			</div>
			<div class="flex flex-col gap-3">
				<input
					type="email"
					bind:value={confirmEmail}
					placeholder="Enter your email"
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
					       px-3 py-2.5 text-sm text-[var(--color-text-primary)]
					       placeholder:text-[var(--color-text-muted)]
					       focus:border-[var(--color-error-500)] focus:outline-none transition-colors"
				/>
				{#if deleteError}
					<p class="text-xs text-[var(--color-error-400)]">{deleteError}</p>
				{/if}
				<button
					onclick={handleDelete}
					disabled={deleting || !confirmEmail.trim()}
					class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium
					       text-white hover:bg-[var(--color-error-400)] disabled:opacity-50
					       disabled:cursor-not-allowed transition-colors">
					{deleting ? 'Deleting account…' : 'Permanently delete my account'}
				</button>
				<button onclick={reset} disabled={deleting}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
					       disabled:opacity-50 transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
