<script lang="ts">
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';

	interface Props {
		chapterId: string;
		textbookId: string;
		chapterTitle: string;
		children: import('svelte').Snippet;
	}

	let { chapterId, textbookId, chapterTitle, children }: Props = $props();
</script>

<div class="group relative">
	{@render children()}
	<!-- Bookmark button anchored top-right of block, always above content -->
	<div class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
	     style="pointer-events: auto;">
		<BookmarkButton
			contentType="chapter"
			contentId={chapterId}
			contentTitle={chapterTitle}
			contentMeta={{ textbookId }}
		/>
	</div>
</div>
