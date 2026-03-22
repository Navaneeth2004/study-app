<script lang="ts">
	import { onMount } from 'svelte';
	import { getComments, createComment, updateComment, softDeleteComment, voteComment } from '$lib/social/commentService';
	import CommentItem from './CommentItem.svelte';
	import CommentInput from './CommentInput.svelte';
	import { pb } from '$lib/shared/pocketbase';
	import type { Comment } from '$lib/social/socialTypes';

	interface Props {
		contentType: string;
		contentId: string;
		contentOwnerId?: string;
		isSharedContent: boolean;
	}

	let { contentType, contentId, contentOwnerId = '', isSharedContent }: Props = $props();

	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);

	const isLoggedIn = pb.authStore.isValid;
	const totalCount = $derived(comments.length);

	onMount(async () => { if (isSharedContent) await loadComments(); });

	async function loadComments(page = 1) {
		if (page === 1) loading = true; else loadingMore = true;
		error = '';
		try {
			const result = await getComments(contentType, contentId, page);
			if (page === 1) comments = result.comments;
			else comments = [...comments, ...result.comments];
			totalPages = result.totalPages;
			currentPage = page;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load comments.';
		} finally { loading = false; loadingMore = false; }
	}

	async function handlePost(text: string) {
		await createComment(contentType, contentId, text);
		await loadComments(1);
	}

	async function handleReply(parentId: string, text: string) {
		await createComment(contentType, contentId, text, parentId);
		await loadComments(1);
	}

	async function handleEdit(id: string, text: string) {
		await updateComment(id, text);
		comments = comments.map((c) => {
			if (c.id === id) return { ...c, text };
			if (c.replies) return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, text } : r) };
			return c;
		});
	}

	async function handleDelete(id: string) {
		await softDeleteComment(id);
		comments = comments.map((c) => {
			if (c.id === id) return { ...c, isDeleted: true };
			if (c.replies) return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, isDeleted: true } : r) };
			return c;
		});
	}

	async function handleVote(id: string, vote: 1 | -1) {
		await voteComment(id, vote);
		// Re-fetch to get accurate vote counts and re-sort
		await loadComments(1);
	}
</script>

{#if isSharedContent}
	<section class="flex flex-col gap-5">
		<div class="flex items-center gap-3">
			<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Discussion</h2>
			{#if totalCount > 0}
				<span class="text-sm text-[var(--color-text-muted)]">{totalCount} comment{totalCount === 1 ? '' : 's'}</span>
			{/if}
		</div>

		{#if isLoggedIn}
			<CommentInput onPost={handlePost} />
		{:else}
			<p class="text-sm text-[var(--color-text-muted)]">Sign in to join the discussion.</p>
		{/if}

		{#if loading}
			<div class="flex flex-col gap-3">
				{#each Array(3) as _}
					<div class="h-20 rounded-xl bg-[var(--color-surface-800)]"></div>
				{/each}
			</div>
		{:else if error}
			<p class="text-sm text-[var(--color-error-400)]">{error}</p>
		{:else if comments.length === 0}
			<p class="text-sm text-[var(--color-text-muted)]">No comments yet. Be the first!</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each comments as comment (comment.id)}
					<CommentItem
						{comment}
						{contentOwnerId}
						onReply={handleReply}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onVote={handleVote}
					/>
				{/each}
			</div>

			{#if currentPage < totalPages}
				<button
					onclick={() => loadComments(currentPage + 1)}
					disabled={loadingMore}
					class="self-start rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
					       disabled:opacity-50 transition-colors"
				>
					{loadingMore ? 'Loading…' : 'Load more'}
				</button>
			{/if}
		{/if}
	</section>
{/if}
