<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
	}

	let { data }: Props = $props();

	const rawUrl = (data.url as string) ?? '';
	const description = (data.description as string) ?? '';

	function getEmbedUrl(raw: string): string | null {
		const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
		if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
		const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
		if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
		return null;
	}

	const embedUrl = getEmbedUrl(rawUrl);
</script>

{#if embedUrl}
	<div class="flex flex-col gap-2">
		<div class="relative w-full overflow-hidden rounded-xl border border-[var(--color-surface-700)]"
		     style="padding-top: 56.25%;">
			<iframe
				src={embedUrl}
				title={description || 'Video'}
				class="absolute inset-0 h-full w-full"
				frameborder="0"
				allowfullscreen
			></iframe>
		</div>
		{#if description}
			<p class="text-xs text-[var(--color-text-muted)]">{description}</p>
		{/if}
	</div>
{:else if rawUrl}
	<p class="text-sm text-[var(--color-error-400)]">Invalid video URL.</p>
{/if}
