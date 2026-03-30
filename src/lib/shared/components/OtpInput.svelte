<script lang="ts">
	import { validateOtp } from '$lib/auth/authValidation';
	import FormField from './FormField.svelte';

	interface Props {
		onSubmit: (otp: string) => Promise<void>;
		onBack?: () => void;
		onResend?: () => Promise<void>;
		email: string;
		/** When true, hides the "← Use a different email" back button */
		hideBack?: boolean;
	}

	let { onSubmit, onBack, onResend, email, hideBack = false }: Props = $props();

	let otp = $state('');
	let loading = $state(false);
	let resending = $state(false);
	let resendCooldown = $state(0);
	let error = $state('');
	let resendSuccess = $state(false);

	async function handleSubmit() {
		error = '';
		const validationError = validateOtp(otp);
		if (validationError) { error = validationError; return; }
		loading = true;
		try {
			await onSubmit(otp);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid code. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleResend() {
		if (resendCooldown > 0 || resending || !onResend) return;
		resending = true; resendSuccess = false; error = '';
		try {
			await onResend();
			resendSuccess = true;
			resendCooldown = 60;
			const interval = setInterval(() => {
				resendCooldown--;
				if (resendCooldown <= 0) clearInterval(interval);
			}, 1000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not resend code.';
		} finally { resending = false; }
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSubmit();
	}
</script>

<div class="flex flex-col gap-4">
	<FormField
		id="otp"
		label="Verification code"
		type="text"
		bind:value={otp}
		placeholder="123456"
		autocomplete="one-time-code"
		inputmode="numeric"
		maxlength={6}
		{error}
		onKeydown={handleKeydown}
		extraClass="text-center font-mono text-xl tracking-[0.5em] placeholder:tracking-normal"
	/>

	{#if resendSuccess}
		<p class="text-sm text-[var(--color-success-500)]">New code sent — check your inbox.</p>
	{/if}

	<button
		onclick={handleSubmit}
		disabled={loading}
		class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-3 font-medium
		       text-white transition-all hover:bg-[var(--color-accent-400)]
		       disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
	>
		{loading ? 'Verifying…' : 'Verify code'}
	</button>

	<div class="flex items-center {hideBack ? 'justify-end' : 'justify-between'} gap-4">
		{#if !hideBack && onBack}
			<button onclick={onBack} class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				← Use a different email
			</button>
		{/if}

		{#if onResend}
			<button
				onclick={handleResend}
				disabled={resendCooldown > 0 || resending}
				class="text-sm text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)]
				       disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors"
			>
				{resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
			</button>
		{/if}
	</div>
</div>
