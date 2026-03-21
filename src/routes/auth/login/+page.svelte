<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/auth/authService';
	import { validateLoginForm, validateEmail, validatePassword } from '$lib/auth/authValidation';
	import FormField from '$lib/shared/components/FormField.svelte';
	import type { ValidationErrors } from '$lib/auth/authTypes';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errors = $state<ValidationErrors>({});
	let serverError = $state('');

	async function handleLogin() {
		errors = validateLoginForm(email, password);
		if (errors.email || errors.password) return;

		loading = true;
		serverError = '';
		try {
			await login(email, password);
			await goto('/viewer');
		} catch (e) {
			serverError = e instanceof Error ? e.message : 'Could not log in. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleEmailInput() {
		if (errors.email) errors = { ...errors, email: validateEmail(email) };
	}

	function handlePasswordInput() {
		if (errors.password) errors = { ...errors, password: validatePassword(password) };
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') handleLogin();
	}
</script>

<svelte:head>
	<title>Log in — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Welcome back</h1>
		<p class="text-sm text-[var(--color-text-secondary)]">
			Sign in to your account.
		</p>
	</div>

	<div class="flex flex-col gap-4">
		<FormField
			id="email"
			label="Email address"
			type="email"
			bind:value={email}
			placeholder="you@example.com"
			autocomplete="email"
			error={errors.email}
			onInput={handleEmailInput}
			onKeydown={handleKeydown}
		/>
		<FormField
			id="password"
			label="Password"
			type="password"
			bind:value={password}
			placeholder="••••••••"
			autocomplete="current-password"
			error={errors.password}
			onInput={handlePasswordInput}
			onKeydown={handleKeydown}
		/>
		{#if serverError}
			<p class="text-sm text-[var(--color-error-400)]">{serverError}</p>
		{/if}
	</div>

	<button
		onclick={handleLogin}
		disabled={loading}
		class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-3 font-medium
		       text-white transition-all hover:bg-[var(--color-accent-400)]
		       disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
	>
		{loading ? 'Signing in…' : 'Sign in'}
	</button>

	<p class="text-center text-sm text-[var(--color-text-muted)]">
		No account?
		<a href="/auth/signup" class="text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors">
			Sign up
		</a>
	</p>
</div>