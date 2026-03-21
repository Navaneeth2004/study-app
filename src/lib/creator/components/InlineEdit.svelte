<script lang="ts">
	interface Props {
		value: string;
		placeholder?: string;
		onSave: (value: string) => Promise<void>;
		multiline?: boolean;
		displayClass?: string;
	}

	let {
		value = $bindable(),
		placeholder = 'Click to edit',
		onSave,
		multiline = false,
		displayClass = ''
	}: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let saving = $state(false);
	let error = $state('');

	function startEdit() {
		draft = value;
		error = '';
		editing = true;
	}

	async function save() {
		const trimmed = draft.trim();
		if (trimmed === value) {
			editing = false;
			return;
		}
		saving = true;
		error = '';
		try {
			await onSave(trimmed);
			value = trimmed;
			editing = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !multiline) {
			e.preventDefault();
			save();
		}
		if (e.key === 'Escape') {
			editing = false;
		}
	}
</script>

{#if editing}
	<div class="flex flex-col gap-1.5">
		{#if multiline}
			<textarea
				bind:value={draft}
				onkeydown={handleKeydown}
				disabled={saving}
				rows={3}
				class="w-full rounded-lg border border-[var(--color-accent-500)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
				       focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/20
				       disabled:opacity-50 resize-none transition-colors"
				{placeholder}
			></textarea>
		{:else}
			<input
				type="text"
				bind:value={draft}
				onkeydown={handleKeydown}
				disabled={saving}
				class="w-full rounded-lg border border-[var(--color-accent-500)] bg-[var(--color-surface-800)]
				       px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
				       focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/20
				       disabled:opacity-50 transition-colors"
				{placeholder}
			/>
		{/if}
		{#if error}
			<p class="text-xs text-[var(--color-error-400)]">{error}</p>
		{/if}
		<div class="flex gap-2">
			<button
				onclick={save}
				disabled={saving}
				class="rounded-lg bg-[var(--color-accent-500)] px-3 py-1.5 text-xs font-medium
				       text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 transition-colors"
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
			<button
				onclick={() => (editing = false)}
				disabled={saving}
				class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1.5 text-xs
				       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
				       disabled:opacity-50 transition-colors"
			>
				Cancel
			</button>
		</div>
	</div>
{:else}
	<button onclick={startEdit} class="group flex items-center gap-2 text-left {displayClass}">
		<span class={value ? '' : 'text-[var(--color-text-muted)]'}>
			{value || placeholder}
		</span>
		<svg
			width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			class="shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
		>
			<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
			<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
		</svg>
	</button>
{/if}