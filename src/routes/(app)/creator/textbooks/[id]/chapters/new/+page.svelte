<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createChapter, listChapters } from '$lib/creator/chapterService';
	import FormField from '$lib/shared/components/FormField.svelte';
	import type { ChapterFormErrors } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);

	let title = $state('');
	let loading = $state(false);
	let errors = $state<ChapterFormErrors>({});
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
			const existing = await listChapters(textbookId);
			const order = existing.length + 1;
			await createChapter(textbookId, { title: title.trim() }, order);
			await goto(`/creator/textbooks/${textbookId}`);
		} catch (e) {
			serverError = e instanceof Error ? e.message : 'Could not create chapter.';
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSubmit();
	}
</script>

<svelte:head>
	<title>New Chapter — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-lg">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">New Chapter</h1>
		<p class="text-[var(--color-text-secondary)]">Add a chapter to this textbook.</p>
	</div>

	<div class="flex flex-col gap-4">
		<FormField
			id="title"
			label="Chapter title"
			type="text"
			bind:value={title}
			placeholder="e.g. Chapter 1: Cell Biology"
			error={errors.title}
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
			{loading ? 'Creating…' : 'Create Chapter'}
		</button>
		<a
			href="/creator/textbooks/{textbookId}"
			class="rounded-xl border border-[var(--color-surface-600)] px-5 py-2.5 text-sm
			       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
			       transition-colors"
		>
			Cancel
		</a>
	</div>
</div>