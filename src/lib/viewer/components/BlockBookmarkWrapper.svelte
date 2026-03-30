<script lang="ts">
	import BookmarkButton from '$lib/shared/components/BookmarkButton.svelte';

	interface Props {
		blockId: string;
		blockType: string;
		blockData: Record<string, unknown>;
		textbookId: string;
		chapterId: string;
		children: import('svelte').Snippet;
	}

	let { blockId, blockType, blockData, textbookId, chapterId, children }: Props = $props();

	const blockTitle = $derived.by(() => {
		if ('text' in blockData && typeof blockData.text === 'string') return blockData.text.slice(0, 60);
		if ('html' in blockData && typeof blockData.html === 'string') return blockData.html.replace(/<[^>]+>/g, '').slice(0, 60);
		if ('items' in blockData && Array.isArray(blockData.items)) return (blockData.items[0] as string ?? '').slice(0, 60);
		if ('headers' in blockData && Array.isArray(blockData.headers)) return (blockData.headers as string[]).join(', ').slice(0, 60);
		return blockType.charAt(0).toUpperCase() + blockType.slice(1) + ' block';
	});
</script>

<!--
  overflow: visible is crucial — without it the absolute bookmark button gets clipped.
  The button is placed at top-right, outside the normal flow.
-->
<div class="group relative" style="overflow: visible;">
	<!-- Bookmark pill — appears on hover, floats to the top-right of the block -->
	<div class="absolute right-0 -top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
		<BookmarkButton
			contentType="chapter"
			contentId={blockId}
			contentTitle={blockTitle}
			contentSubtitle="Block"
			contentMeta={{ textbookId, chapterId, blockId }}
		/>
	</div>
	{@render children()}
</div>
