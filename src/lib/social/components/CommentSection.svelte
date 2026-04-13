<script lang="ts">
	import { onMount } from 'svelte';
	import { getComments, createComment, updateComment, softDeleteComment, voteComment, pinComment, unpinComment } from '$lib/social/commentService';
	import type { CommentSortMode } from '$lib/social/commentService';
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

	let pinnedComments = $state<Comment[]>([]);
	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let pinError = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let sortMode = $state<CommentSortMode>('popular');

	const isLoggedIn = pb.authStore.isValid;
	const isContentOwner = $derived(!!contentOwnerId && contentOwnerId === pb.authStore.record?.id);
	const totalCount = $derived(pinnedComments.length + comments.length);

	onMount(async () => { if (isSharedContent) await loadComments(); });

	async function loadComments(page = 1, mode = sortMode) {
		if (page === 1) loading = true; else loadingMore = true;
		error = '';
		try {
			const result = await getComments(contentType, contentId, page, 10, mode);
			pinnedComments = result.pinnedComments;
			if (page === 1) comments = result.comments;
			else comments = [...comments, ...result.comments];
			totalPages = result.totalPages;
			currentPage = page;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load comments.';
		} finally { loading = false; loadingMore = false; }
	}

	async function switchSort(mode: CommentSortMode) {
		sortMode = mode;
		await loadComments(1, mode);
	}

	async function handlePost(text: string) {
		await createComment(contentType, contentId, text);
		await loadComments(1, sortMode);
	}

	async function handleReply(parentId: string, text: string) {
		await createComment(contentType, contentId, text, parentId);
		await loadComments(1, sortMode);
	}

	async function handleEdit(id: string, text: string) {
		await updateComment(id, text);
		const update = (list: Comment[]) => list.map((c) => {
			if (c.id === id) return { ...c, text };
			if (c.replies) return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, text } : r) };
			return c;
		});
		pinnedComments = update(pinnedComments);
		comments = update(comments);
	}

	async function handleDelete(id: string) {
		await softDeleteComment(id);
		const update = (list: Comment[]) => list.map((c) => {
			if (c.id === id) return { ...c, isDeleted: true };
			if (c.replies) return { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, isDeleted: true } : r) };
			return c;
		});
		pinnedComments = update(pinnedComments);
		comments = update(comments);
	}

	async function handlePin(id: string) {
		pinError = '';
		const result = await pinComment(id, contentType, contentId);
		if (result.error) { pinError = result.error; return; }
		await loadComments(1, sortMode);
	}

	async function handleUnpin(id: string) {
		pinError = '';
		await unpinComment(id);
		await loadComments(1, sortMode);
	}

	async function handleVote(id: string, vote: 1 | -1) {
		const uid = pb.authStore.record?.id ?? '';
		function updateVoteInList(list: Comment[]): Comment[] {
			return list.map((c) => {
				if (c.id === id) {
					const removing = c.userVote === vote;
					const wasOpposite = c.userVote !== null && c.userVote !== vote;
					return {
						...c,
						userVote: removing ? null : vote,
						upvotes: vote === 1
							? (removing ? c.upvotes - 1 : c.upvotes + 1)
							: (wasOpposite ? c.upvotes - 1 : c.upvotes),
						downvotes: vote === -1
							? (removing ? c.downvotes - 1 : c.downvotes + 1)
							: (wasOpposite ? c.downvotes - 1 : c.downvotes)
					};
				}
				if (c.replies) return { ...c, replies: updateVoteInList(c.replies) };
				return c;
			});
		}
		pinnedComments = updateVoteInList(pinnedComments);
		comments = updateVoteInList(comments);
		try { await voteComment(id, vote); }
		catch { await loadComments(1, sortMode); }
	}
</script>

{#if isSharedContent}
	<section class="flex flex-col gap-5">
		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div class="flex items-center gap-3">
				<h2 class="text-base font-semibold text-[var(--color-text-primary)]">Discussion</h2>
				{#if totalCount > 0}
					<span class="text-sm text-[var(--color-text-muted)]">{totalCount} comment{totalCount === 1 ? '' : 's'}</span>
				{/if}
			</div>
			<!-- Sort tabs -->
			<div class="flex gap-1 text-xs">
				<button onclick={() => switchSort('popular')}
					class="rounded-lg px-3 py-1.5 font-medium transition-colors
					       {sortMode === 'popular'
						? 'bg-[var(--color-surface-700)] text-[var(--color-text-primary)]'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
					Popular
				</button>
				<button onclick={() => switchSort('latest')}
					class="rounded-lg px-3 py-1.5 font-medium transition-colors
					       {sortMode === 'latest'
						? 'bg-[var(--color-surface-700)] text-[var(--color-text-primary)]'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}">
					Latest
				</button>
			</div>
		</div>

		{#if isLoggedIn}
			<CommentInput onPost={handlePost} />
		{:else}
			<p class="text-sm text-[var(--color-text-muted)]">Sign in to join the discussion.</p>
		{/if}

		{#if pinError}
			<p class="text-xs text-[var(--color-error-400)] rounded-lg border border-[var(--color-error-400)]/30 bg-[var(--color-error-500)]/5 px-3 py-2">{pinError}</p>
		{/if}

		{#if loading}
			<div class="flex flex-col gap-3">
				{#each Array(3) as _}
					<div class="h-20 rounded-xl bg-[var(--color-surface-800)]"></div>
				{/each}
			</div>
		{:else if error}
			<p class="text-sm text-[var(--color-error-400)]">{error}</p>
		{:else if totalCount === 0}
			<p class="text-sm text-[var(--color-text-muted)]">No comments yet. Be the first!</p>
		{:else}
			<div class="flex flex-col gap-3">
				<!-- Pinned comments first -->
				{#if pinnedComments.length > 0}
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-[var(--color-accent-400)]">
								<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
							</svg>
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-400)]">Pinned</span>
						</div>
						{#each pinnedComments as comment (comment.id)}
							<CommentItem
								{comment}
								{contentOwnerId}
								{isContentOwner}
								isPinned={true}
								onReply={handleReply}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onVote={handleVote}
								onPin={handlePin}
								onUnpin={handleUnpin}
							/>
						{/each}
						{#if comments.length > 0}
							<div class="border-t border-[var(--color-surface-700)] pt-1"></div>
						{/if}
					</div>
				{/if}

				<!-- Regular comments (popular by default) -->
				{#each comments as comment (comment.id)}
					<CommentItem
						{comment}
						{contentOwnerId}
						{isContentOwner}
						isPinned={false}
						onReply={handleReply}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onVote={handleVote}
						onPin={handlePin}
						onUnpin={handleUnpin}
					/>
				{/each}
			</div>

			{#if currentPage < totalPages}
				<button onclick={() => loadComments(currentPage + 1, sortMode)} disabled={loadingMore}
					class="self-start rounded-xl border border-[var(--color-surface-600)] px-4 py-2 text-sm
					       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
					       disabled:opacity-50 transition-colors">
					{loadingMore ? 'Loading…' : 'Load more comments'}
				</button>
			{/if}
		{/if}
	</section>
{/if}
