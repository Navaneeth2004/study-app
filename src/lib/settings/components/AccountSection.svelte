<script lang="ts">
	import { pb } from '$lib/shared/pocketbase';
	import { getCurrentUser, logout } from '$lib/auth/authService';
	import { goto } from '$app/navigation';

	const user = getCurrentUser();

	// Steps: 0=idle, 1=warning, 2=email-confirm, 3=otp-sent, 4=enter-otp
	let step = $state<0 | 1 | 2 | 3 | 4>(0);
	let confirmEmail = $state('');
	let otpCode = $state('');
	let otpId = $state('');
	let deleting = $state(false);
	let sendingOtp = $state(false);
	let deleteError = $state('');
	let otpError = $state('');

	async function handleSendOtp() {
		if (confirmEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()) {
			deleteError = 'Email does not match.';
			return;
		}
		sendingOtp = true;
		deleteError = '';
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await (pb.collection('users') as any).requestOTP(user?.email as string);
			otpId = result.otpId;
			step = 4;
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Could not send verification code.';
		} finally {
			sendingOtp = false;
		}
	}

	async function handleDelete() {
		if (!otpCode.trim()) { otpError = 'Enter the verification code.'; return; }
		deleting = true;
		otpError = '';
		try {
			// Verify OTP first — this re-authenticates the user
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await (pb.collection('users') as any).authWithOTP(otpId, otpCode.trim());

			const uid = user?.id as string;

			// 1. Anonymise owned textbooks
			const textbooks = await pb.collection('textbooks').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, fields: 'id'
			});
			await Promise.all(textbooks.map((t) =>
				pb.collection('textbooks').update(t.id as string, { ownerName: 'Anonymous' }, { requestKey: null })
			));

			// 2. Anonymise owned flashcard categories
			const categories = await pb.collection('flashcard_categories').getFullList({
				requestKey: null, filter: `owner = "${uid}"`, fields: 'id'
			});
			await Promise.all(categories.map((c) =>
				pb.collection('flashcard_categories').update(c.id as string, { ownerName: 'Anonymous' }, { requestKey: null })
			));

			// 3. Anonymise all comments
			const comments = await pb.collection('content_comments').getFullList({
				requestKey: null, filter: `user = "${uid}"`, fields: 'id'
			});
			await Promise.all(comments.map((c) =>
				pb.collection('content_comments').update(c.id as string, { userName: 'Anonymous' }, { requestKey: null })
			));

			// 4. Remove follows
			const follows = await pb.collection('follows').getFullList({
				requestKey: null,
				filter: `follower = "${uid}" || following = "${uid}"`,
				fields: 'id'
			});
			await Promise.all(follows.map((f) =>
				pb.collection('follows').delete(f.id as string, { requestKey: null })
			));

			// 5. Soft-delete user
			await pb.collection('users').update(uid, {
				isDeleted: true,
				isProfilePublic: false
			});

			// 6. Clear AI keys for this user from localStorage
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('ai_key_')) keysToRemove.push(key);
			}
			keysToRemove.forEach((k) => localStorage.removeItem(k));

			logout();
			goto('/auth/login');
		} catch (e) {
			otpError = e instanceof Error ? e.message : 'Invalid or expired code.';
			deleting = false;
		}
	}

	function reset() {
		step = 0; confirmEmail = ''; otpCode = ''; otpId = '';
		deleteError = ''; otpError = '';
	}
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Account</h2>
	<div class="rounded-xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] divide-y divide-[var(--color-surface-700)]">
		<div class="px-5 py-4">
			<span class="text-xs text-[var(--color-text-muted)]">Email</span>
			<p class="text-sm text-[var(--color-text-primary)] mt-0.5">{user?.email || '—'}</p>
		</div>
		<div class="px-5 py-4">
			<button onclick={() => (step = 1)}
				class="text-sm text-[var(--color-error-400)] hover:opacity-80 transition-opacity">
				Delete account
			</button>
		</div>
	</div>
</section>

<!-- Step 1: Warning -->
{#if step === 1}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex flex-col gap-2">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error-500)]/15">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-[var(--color-error-400)]"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				</div>
				<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Delete your account?</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">Your shared content stays visible as "Anonymous". All other data is permanently deleted. <strong class="text-[var(--color-text-primary)]">This cannot be undone.</strong></p>
			</div>
			<div class="flex flex-col gap-2">
				<button onclick={() => (step = 2)}
					class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-400)] transition-colors">
					Yes, delete my account
				</button>
				<button onclick={reset}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Step 2: Email confirmation + send OTP -->
{#if step === 2}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-error-500)]/40 bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex flex-col gap-1.5">
				<h2 class="text-base font-semibold text-[var(--color-error-400)]">Confirm your email</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">Type your email address to continue:</p>
				<code class="rounded-lg bg-[var(--color-surface-800)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]">{user?.email}</code>
			</div>
			<div class="flex flex-col gap-3">
				<input type="email" bind:value={confirmEmail}
					placeholder="Enter your email"
					onkeydown={(e) => e.key === 'Enter' && handleSendOtp()}
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-error-500)] focus:outline-none transition-colors" />
				{#if deleteError}<p class="text-xs text-[var(--color-error-400)]">{deleteError}</p>{/if}
				<button onclick={handleSendOtp} disabled={sendingOtp || !confirmEmail.trim()}
					class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{sendingOtp ? 'Sending code…' : 'Send verification code'}
				</button>
				<button onclick={reset} disabled={sendingOtp}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Step 4: Enter OTP -->
{#if step === 4}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
		<div class="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[var(--color-error-500)]/40 bg-[var(--color-surface-900)] p-6 shadow-2xl">
			<div class="flex flex-col gap-1.5">
				<h2 class="text-base font-semibold text-[var(--color-error-400)]">Enter verification code</h2>
				<p class="text-sm text-[var(--color-text-secondary)]">
					We sent a 6-digit code to <strong class="text-[var(--color-text-primary)]">{user?.email}</strong>. Enter it below to permanently delete your account.
				</p>
			</div>
			<div class="flex flex-col gap-3">
				<input
					type="text"
					inputmode="numeric"
					maxlength={6}
					bind:value={otpCode}
					placeholder="123456"
					onkeydown={(e) => e.key === 'Enter' && handleDelete()}
					class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2.5 text-center text-xl font-mono tracking-[0.5em] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] placeholder:tracking-normal focus:border-[var(--color-error-500)] focus:outline-none transition-colors"
				/>
				{#if otpError}<p class="text-xs text-[var(--color-error-400)]">{otpError}</p>{/if}
				<button onclick={handleDelete} disabled={deleting || !otpCode.trim()}
					class="w-full rounded-xl bg-[var(--color-error-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					{deleting ? 'Deleting…' : 'Permanently delete my account'}
				</button>
				<button onclick={reset} disabled={deleting}
					class="w-full rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors">
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
