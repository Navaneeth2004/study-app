<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/shared/pocketbase';
	import { getCurrentUser } from '$lib/auth/authService';
	import { listChapters } from '$lib/viewer/viewerService';
	import ChapterList from '$lib/viewer/components/ChapterList.svelte';
	import EmptyState from '$lib/shared/components/EmptyState.svelte';
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';
	import StarRating from '$lib/shared/components/StarRating.svelte';
	import CommentSection from '$lib/social/components/CommentSection.svelte';
	import ForkModal from '$lib/shared/components/ForkModal.svelte';
	import ForkProgressModal from '$lib/shared/components/ForkProgressModal.svelte';
	import { forkTextbook } from '$lib/sharing/forkService';
	import type { ForkProgress } from '$lib/sharing/forkTypes';
	import type { Textbook, Chapter } from '$lib/creator/creatorTypes';

	const textbookId = $derived($page.params.id as string);
	const user = getCurrentUser();

	let textbook = $state<Textbook | null>(null);
	let chapters = $state<Chapter[]>([]);
	let loading = $state(true);
	let error = $state('');
	let authorName = $state('');
	let isInstalled = $state(false);
	let isShared = $state(false);

	let showForkModal = $state(false);
	let forkRunning = $state(false);
	let forkProgress = $state<ForkProgress | null>(null);
	let forkError = $state<string | null>(null);
	let pendingForkId = $state('');

	onMount(async () => {
		loading = true;
		try {
			const r = await pb.collection('textbooks').getOne(textbookId, { requestKey: null });
			textbook = {
				id: r.id as string, title: r.title as string,
				description: (r.description as string) ?? '',
				owner: r.owner as string, created: r.created as string, updated: r.updated as string
			};
			isShared = !!(r.isShared as boolean);
			try {
				const u = await pb.collection('users').getOne(r.owner as string, { requestKey: null });
				authorName = (u.name as string) || (u.email as string) || '';
			} catch { authorName = ''; }
			const isFork = !!(r.forkedFrom as string);
			isInstalled = (r.owner as string) !== user?.id && !isFork;
			chapters = await listChapters(textbookId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load textbook.';
		} finally { loading = false; }
	});

	async function handleForkConfirm(newTitle: string) {
		showForkModal = false; forkRunning = true;
		forkProgress = { step: 0, total: 1, message: 'Starting…' };
		forkError = null; pendingForkId = '';
		try {
			pendingForkId = await forkTextbook(textbookId, newTitle, (p) => { forkProgress = p; });
		} catch (e) { forkError = e instanceof Error ? e.message : 'Fork failed.'; }
	}
	function handleForkDone() {
		forkRunning = false;
		if (pendingForkId) goto(`/viewer/textbooks/${pendingForkId}`);
	}
</script>

<svelte:head>
	<title>{textbook?.title ?? 'Textbook'} — StudyApp</title>
</svelte:head>

<ForkModal isOpen={showForkModal} contentType="textbook"
	originalTitle={textbook?.title ?? ''} originalAuthor={authorName}
	onConfirm={handleForkConfirm} onClose={() => (showForkModal = false)} />
<ForkProgressModal isOpen={forkRunning} progress={forkProgress} error={forkError} onDone={handleForkDone} />

<div class="flex flex-col gap-6 max-w-2xl">
	<nav class="flex items-center gap-2 text-sm">
		<a href="/viewer" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">Home</a>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="text-[var(--color-text-muted)]"><polyline points="9 18 15 12 9 6"/></svg>
		<span class="text-[var(--color-text-secondary)]">{textbook?.title ?? '…'}</span>
	</nav>

	{#if loading}
		<div class="flex flex-col gap-3">
			<div class="h-8 w-56 rounded bg-[var(--color-surface-800)]"></div>
			<div class="h-4 w-72 rounded bg-[var(--color-surface-800)]"></div>
		</div>
	{:else if error}
		<p class="text-sm text-[var(--color-error-400)]">{error}</p>
	{:else if textbook}
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<h1 class="font-display text-3xl text-[var(--color-text-primary)] flex-1">{textbook.title}</h1>
				<BookmarkButton contentType="textbook" contentId={textbook.id} contentTitle={textbook.title} />
			</div>
			{#if textbook.description}
				<p class="text-[var(--color-text-secondary)]">{textbook.description}</p>
			{/if}
			{#if isShared}
				<StarRating contentType="textbook" contentId={textbook.id} contentOwnerId={textbook.owner} readonly={false} showCount={true} />
			{/if}
		</div>

		{#if isInstalled}
			<div class="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-surface-700)]
			            bg-[var(--color-surface-900)] px-4 py-3">
				<div class="flex flex-col gap-0.5">
					<p class="text-sm font-medium text-[var(--color-text-secondary)]">Installed content — read only</p>
					<p class="text-xs text-[var(--color-text-muted)]">Duplicate to make edits, share or export.</p>
				</div>
				<button onclick={() => (showForkModal = true)}
					class="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-4 py-2
					       text-sm font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>
						<path d="M12 7v4M6 17v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
					</svg>
					Duplicate
				</button>
			</div>
		{/if}

		<section class="flex flex-col gap-3">
			<h2 class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
				{chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
			</h2>
			{#if chapters.length === 0}
				<EmptyState heading="No chapters yet" description="This textbook has no chapters yet." />
			{:else}
				<ChapterList {chapters} textbookId={textbookId} />
			{/if}
		</section>

		<!-- Comments — only for shared content -->
		{#if isShared}
			<div class="border-t border-[var(--color-surface-700)] pt-6">
				<CommentSection contentType="textbook" contentId={textbookId} contentOwnerId={textbook?.owner ?? ''} isSharedContent={true} />
			</div>
		{/if}
	{/if}
</div>
