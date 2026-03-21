<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		id?: string;
		label?: string;
		autocomplete?: 'current-password' | 'new-password';
	}

	let {
		value = $bindable(),
		placeholder = '••••••••',
		disabled = false,
		error = '',
		id = 'password',
		label = 'Password',
		autocomplete = 'current-password'
	}: Props = $props();

	let visible = $state(false);
</script>

<div class="flex flex-col gap-2">
	{#if label}
		<label for={id} class="text-sm font-medium text-[var(--color-text-secondary)]">
			{label}
		</label>
	{/if}

	<div class="relative">
		<input
			{id}
			type={visible ? 'text' : 'password'}
			{placeholder}
			{disabled}
			{autocomplete}
			bind:value
			class="w-full rounded-xl border border-[var(--color-surface-600)]
			       bg-[var(--color-surface-800)] px-4 py-3 pr-11
			       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
			       focus:border-[var(--color-accent-500)] focus:outline-none
			       focus:ring-2 focus:ring-[var(--color-accent-500)]/20
			       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
			class:border-[var(--color-error-500)]={!!error}
		/>
		<button
			type="button"
			onclick={() => (visible = !visible)}
			{disabled}
			aria-label={visible ? 'Hide password' : 'Show password'}
			class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]
			       hover:text-[var(--color-text-secondary)] transition-colors
			       disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if visible}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
				</svg>
			{/if}
		</button>
	</div>

	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}
</div>