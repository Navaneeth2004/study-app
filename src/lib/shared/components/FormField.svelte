<script lang="ts">
	type InputMode =
		| 'text'
		| 'search'
		| 'email'
		| 'none'
		| 'tel'
		| 'url'
		| 'numeric'
		| 'decimal'
		| null
		| undefined;

	interface Props {
		id: string;
		label: string;
		type?: string;
		value: string;
		placeholder?: string;
		error?: string;
		autocomplete?: import('svelte/elements').HTMLInputAttributes['autocomplete'];
		inputmode?: InputMode;
		maxlength?: number;
		extraClass?: string;
		onInput?: () => void;
		onKeydown?: (e: KeyboardEvent) => void;
	}

	let {
		id,
		label,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		error = '',
		autocomplete,
		inputmode,
		maxlength,
		extraClass = '',
		onInput,
		onKeydown
	}: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<label for={id} class="text-sm font-medium text-[var(--color-text-secondary)]">
		{label}
	</label>
	<input
		{id}
		{type}
		{placeholder}
		{autocomplete}
		{inputmode}
		{maxlength}
		bind:value
		oninput={onInput}
		onkeydown={onKeydown}
		class="w-full rounded-xl border border-[var(--color-surface-600)]
		       bg-[var(--color-surface-800)] px-4 py-3 text-[var(--color-text-primary)]
		       placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)]
		       focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/20
		       transition-colors {extraClass}"
		class:border-[var(--color-error-500)]={!!error}
	/>
	{#if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{/if}
</div>