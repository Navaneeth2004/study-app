<script lang="ts">
	import { goto } from '$app/navigation';
	import { createTextbook } from '$lib/creator/textbookService';
	import FormField from '$lib/shared/components/FormField.svelte';
	import type { TextbookFormErrors } from '$lib/creator/creatorTypes';

	let title = $state('');
	let description = $state('');
	let loading = $state(false);
	let errors = $state<TextbookFormErrors>({});
	let serverError = $state('');

	async function handleSubmit() {
		errors = {};
		if (!title.trim()) {
			errors = { title: 'Title is required.' };
			return;
		}
		loading = true;
		serverError = '';
		try {
			const textbook = await createTextbook({ title: title.trim(), description: description.trim() });
			await goto(`/creator/textbooks/${textbook.id}`);
		} catch (e) {
			serverError = e instanceof Error ? e.message : 'Could not create textbook.';
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSubmit();
	}
</script>

<svelte:head>
	<title>New Textbook — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-lg">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">New Textbook</h1>
		<p class="text-[var(--color-text-secondary)]">Add a new textbook to your collection.</p>
	</div>

	<div class="flex flex-col gap-4">
		<FormField
			id="title"
			label="Title"
			type="text"
			bind:value={title}
			placeholder="e.g. Introduction to Biology"
			error={errors.title}
			onKeydown={handleKeydown}
		/>
		<FormField
			id="description"
			label="Description (optional)"
			type="text"
			bind:value={description}
			placeholder="A short description of this textbook"
			onKeydown={handleKeydown}
		/>
		{#if serverError}
			<p class="text-sm text-[var(--color-error-400)]">{serverError}</p>
		{/if}
	</div>

    <div class="flex gap-3">
        <button
            onclick={handleSubmit}
            disabled={loading}
            class="rounded-xl bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-medium
                text-white hover:bg-[var(--color-accent-400)] disabled:cursor-not-allowed
                disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
            {loading ? 'Creating…' : 'Create Textbook'}
        </button>
        <a href="/creator" class="rounded-xl border border-[var(--color-surface-600)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Cancel
        </a>
    </div>
</div>