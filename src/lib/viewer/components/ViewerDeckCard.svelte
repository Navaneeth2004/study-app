<script lang="ts">
	interface Props {
		name: string;
		subtitle?: string;
		cardCount: number;
		isOwn?: boolean;
		authorName?: string;
		onClick: () => void;
	}

	let { name, subtitle, cardCount, isOwn = true, authorName = '', onClick }: Props = $props();
</script>

<!-- Use a button (not div) so click always registers reliably -->
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
		<!-- Flashcard deck icon -->
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
