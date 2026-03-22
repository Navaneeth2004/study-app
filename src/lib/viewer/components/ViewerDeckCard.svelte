<script lang="ts">
	interface Props {
		name: string;
		subtitle?: string;
		cardCount: number;
		isOwn?: boolean;
		authorName?: string;
		isFork?: boolean;
		forkedFromAuthor?: string;
		onClick: () => void;
	}

	let { name, subtitle, cardCount, isOwn = true, authorName = '', isFork = false, forkedFromAuthor = '', onClick }: Props = $props();
</script>

<button
	type="button"
	onclick={onClick}
	class="app-card app-card-clickable text-left w-full"
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex flex-col gap-1 min-w-0 flex-1">
			<span class="app-card-title leading-snug truncate">
				{name}
			</span>
			{#if subtitle}
				<p class="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">{subtitle}</p>
			{/if}
			{#if isFork && forkedFromAuthor}
				<div class="flex items-center gap-1.5 mt-1">
					<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
					     class="shrink-0 text-[var(--color-text-muted)]">
						<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>
						<path d="M12 7v4M6 17v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
					</svg>
					<span class="text-xs text-[var(--color-text-muted)]">Forked from {forkedFromAuthor}</span>
				</div>
			{:else if !isOwn}
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
		<div class="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
		     style="background: color-mix(in srgb, var(--color-accent-500) 15%, transparent);">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
			     style="color: var(--color-accent-400);">
				<rect x="2" y="4" width="14" height="10" rx="2"/>
				<rect x="8" y="10" width="14" height="10" rx="2"/>
			</svg>
		</div>
	</div>
	<span class="text-xs text-[var(--color-text-muted)] mt-auto">
		{cardCount} {cardCount === 1 ? 'card' : 'cards'}
	</span>
</button>
