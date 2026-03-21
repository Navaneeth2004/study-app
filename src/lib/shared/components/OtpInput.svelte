<script lang="ts">
	import { validateOtp } from '$lib/auth/authValidation';
	import FormField from './FormField.svelte';

	interface Props {
		onSubmit: (otp: string) => Promise<void>;
		onBack: () => void;
		email: string;
	}

	let { onSubmit, onBack, email }: Props = $props();

	let otp = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit() {
		error = '';
		const validationError = validateOtp(otp);
		if (validationError) {
			error = validationError;
			return;
		}
		loading = true;
		try {
			await onSubmit(otp);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid code. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleSubmit();
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<p class="text-sm text-[var(--color-text-secondary)]">We sent a 6-digit code to</p>
		<p class="font-medium text-[var(--color-text-primary)]">{email}</p>
	</div>

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

	<button
		onclick={handleSubmit}
		disabled={loading}
		class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-3 font-medium
		       text-white transition-all hover:bg-[var(--color-accent-400)]
		       disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
	>
		{loading ? 'Verifying…' : 'Verify code'}
	</button>

	<button
		onclick={onBack}
		class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
	>
		← Use a different email
	</button>
</div>