<script lang="ts">
	import { isEmailVerified, getCurrentUser, resendOtp, verifyOtp } from '$lib/auth/authService';
	import { goto } from '$app/navigation';
	import RoleSection from '$lib/settings/components/RoleSection.svelte';
	import AISettingsSection from '$lib/settings/components/AISettingsSection.svelte';
	import ReviewSettingsSection from '$lib/settings/components/ReviewSettingsSection.svelte';
	import SharingSection from '$lib/settings/components/SharingSection.svelte';
	import InstalledContentSection from '$lib/settings/components/InstalledContentSection.svelte';
	import ExportImportSection from '$lib/settings/components/ExportImportSection.svelte';
	import AccountSection from '$lib/settings/components/AccountSection.svelte';
	import OtpInput from '$lib/shared/components/OtpInput.svelte';

	const verified = isEmailVerified();
	const user = getCurrentUser();

	let showOtp = $state(false);
	let otpId = $state('');
	let sendingOtp = $state(false);
	let otpError = $state('');

	async function startVerification() {
		if (!user?.email) return;
		sendingOtp = true; otpError = '';
		try {
			const result = await resendOtp(user.email as string);
			otpId = result.otpId;
			showOtp = true;
		} catch (e) { otpError = e instanceof Error ? e.message : 'Could not send code.'; }
		finally { sendingOtp = false; }
	}

	async function handleVerify(otp: string) {
		// verifyOtp authenticates with PocketBase which updates authStore;
		// navigating to /settings causes a fresh load which re-reads isEmailVerified()
		await verifyOtp(otpId, otp);
		goto('/viewer'); // go to app — they're now verified
	}

	async function handleResend() {
		if (!user?.email) return;
		const result = await resendOtp(user.email as string);
		otpId = result.otpId;
	}
</script>

<svelte:head><title>Settings — StudyApp</title></svelte:head>

<div class="flex flex-col gap-8 max-w-2xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Settings</h1>
		<p class="text-[var(--color-text-secondary)]">Manage your account and preferences.</p>
	</div>

	{#if !verified}
		{#if showOtp}
			<!-- OTP entry — no duplicate text, no "use different email" button -->
			<div class="rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-6 flex flex-col gap-3">
				<div>
					<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Enter verification code</h2>
					<p class="text-sm text-[var(--color-text-secondary)] mt-0.5">
						Sent to <span class="text-[var(--color-accent-400)]">{user?.email}</span>
					</p>
				</div>
				<!-- hideBack=true removes the "Use a different email" button since we're already logged in -->
				<OtpInput
					email={user?.email as string}
					hideBack={true}
					onSubmit={handleVerify}
					onResend={handleResend}
				/>
				<button onclick={() => (showOtp = false)} class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
					← Back
				</button>
			</div>
		{:else}
			<div class="flex flex-col gap-4 rounded-2xl border border-[var(--color-warning-500)]/40 bg-[var(--color-warning-500)]/5 p-6">
				<div class="flex items-start gap-4">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-500)]/15">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-[var(--color-warning-400)]">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
							<polyline points="22,6 12,13 2,6"/>
						</svg>
					</div>
					<div class="flex flex-col gap-1">
						<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Verify your email address</h2>
						<p class="text-sm text-[var(--color-text-secondary)]">
							Your account is registered but <strong class="text-[var(--color-text-primary)]">{user?.email}</strong> hasn't been verified yet.
						</p>
					</div>
				</div>
				{#if otpError}<p class="text-sm text-[var(--color-error-400)] pl-14">{otpError}</p>{/if}
				<div class="flex gap-3 pl-14">
					<button onclick={startVerification} disabled={sendingOtp}
						class="rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors">
						{sendingOtp ? 'Sending…' : 'Send verification code'}
					</button>
					<a href="/viewer" class="rounded-xl border border-[var(--color-surface-600)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						Go to app
					</a>
				</div>
			</div>
		{/if}
		<AccountSection />
	{:else}
		<RoleSection />
		<AISettingsSection />
		<ReviewSettingsSection />
		<SharingSection />
		<InstalledContentSection />
		<ExportImportSection />
		<AccountSection />
	{/if}
</div>
