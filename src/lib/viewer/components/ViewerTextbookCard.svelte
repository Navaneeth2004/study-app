<script lang="ts">
	import type { Textbook } from '$lib/creator/creatorTypes';

	interface Props {
		textbook: Textbook;
		chapterCount?: number;
		isOwn?: boolean;
		authorName?: string;
		onClick: () => void;
	}

	let { textbook, chapterCount, isOwn = true, authorName = '', onClick }: Props = $props();
</script>

<div
	role="button"
	tabindex="0"
	onclick={onClick}
	onkeydown={(e) => e.key === 'Enter' && onClick()}
	class="app-card app-card-clickable"
>
	<!-- Top row: title + icon -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<span class="app-card-title leading-snug">
				{textbook.title}
			</span>
			{#if textbook.description}
				<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">
					{textbook.description}
				</p>
			{/if}
			{#if !isOwn}
				<div class="flex items-center gap-1.5 mt-1">
					{#if authorName}
						<span class="text-xs text-[var(--color-text-muted)]">by {authorName}</span>
					{/if}
					<span class="rounded px-1.5 py-0.5 text-xs font-medium"
					      style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent); color: var(--color-accent-400);">
						Installed
					</span>
				</div>
			{/if}
		</div>
		<!-- Book icon -->
		<div class="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
		     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     style="color: var(--color-accent-400);">
				<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
				<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
			</svg>
		</div>
	</div>

	<!-- Bottom: count -->
	{#if chapterCount !== undefined}
		<span class="text-xs text-[var(--color-text-muted)] mt-auto">
			{chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
		</span>
	{/if}
</div>
