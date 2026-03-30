<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		createUserAndRequestOtp, verifyOtp, resendOtp
	} from '$lib/auth/authService';
	import {
		validateSignupForm, validateEmail, validateName,
		validatePassword, validatePasswordConfirm
	} from '$lib/auth/authValidation';
	import OtpInput from '$lib/shared/components/OtpInput.svelte';
	import FormField from '$lib/shared/components/FormField.svelte';
	import type { AuthStep, ValidationErrors, OtpRequest } from '$lib/auth/authTypes';

	let step = $state<AuthStep>('credentials');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let otpRequest = $state<OtpRequest | null>(null);
	let loading = $state(false);
	let errors = $state<ValidationErrors>({});
	let serverError = $state('');

	async function handleSendOtp() {
		errors = validateSignupForm(name, email, password, passwordConfirm);
		if (errors.name || errors.email || errors.password || errors.passwordConfirm) return;
		loading = true; serverError = '';
		try {
			otpRequest = await createUserAndRequestOtp(name.trim(), email, password, passwordConfirm);
			step = 'otp';
		} catch (e) {
			serverError = e instanceof Error ? e.message : 'Could not create your account. Please try again.';
		} finally { loading = false; }
	}

	async function handleVerifyOtp(otp: string) {
		await verifyOtp(otpRequest!.otpId, otp);
		// New users → profile setup
		await goto('/profile/setup');
	}

	async function handleResendOtp() {
		if (!otpRequest) return;
		const result = await resendOtp(otpRequest.email);
		// Update the otpId so the new code can be verified
		otpRequest = result;
	}

	function handleBack() {
		step = 'credentials';
		otpRequest = null;
		serverError = '';
		// Note: the PocketBase account is already created at this point.
		// The user can log in and will be asked to verify in Settings.
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSendOtp();
	}
</script>

<svelte:head><title>Sign up — StudyApp</title></svelte:head>

{#if step === 'credentials'}
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Create your account</h1>
			<p class="text-sm text-[var(--color-text-secondary)]">We'll verify your email with a one-time code.</p>
		</div>
		<div class="flex flex-col gap-4">
			<FormField id="name" label="Full name" type="text" bind:value={name} placeholder="Alex Johnson"
				autocomplete="name" error={errors.name}
				onInput={() => { if (errors.name) errors = { ...errors, name: validateName(name) }; }}
				onKeydown={handleKeydown} />
			<FormField id="email" label="Email address" type="email" bind:value={email} placeholder="you@example.com"
				autocomplete="email" error={errors.email}
				onInput={() => { if (errors.email) errors = { ...errors, email: validateEmail(email) }; }}
				onKeydown={handleKeydown} />
			<FormField id="password" label="Password" type="password" bind:value={password} placeholder="••••••••"
				autocomplete="new-password" error={errors.password}
				onInput={() => { if (errors.password) errors = { ...errors, password: validatePassword(password) }; }}
				onKeydown={handleKeydown} />
			<FormField id="passwordConfirm" label="Confirm password" type="password" bind:value={passwordConfirm}
				placeholder="••••••••" autocomplete="new-password" error={errors.passwordConfirm}
				onInput={() => { if (errors.passwordConfirm) errors = { ...errors, passwordConfirm: validatePasswordConfirm(password, passwordConfirm) }; }}
				onKeydown={handleKeydown} />
			{#if serverError}<p class="text-sm text-[var(--color-error-400)]">{serverError}</p>{/if}
		</div>
		<button onclick={handleSendOtp} disabled={loading}
			class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-3 font-medium text-white
			       transition-all hover:bg-[var(--color-accent-400)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">
			{loading ? 'Creating account…' : 'Create account'}
		</button>
		<p class="text-center text-sm text-[var(--color-text-muted)]">
			Already have an account?
			<a href="/auth/login" class="text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors">Log in</a>
		</p>
	</div>
{:else}
	<OtpInput
		{email}
		onSubmit={handleVerifyOtp}
		onBack={handleBack}
		onResend={handleResendOtp}
	/>
{/if}
