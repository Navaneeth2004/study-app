<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		onUpdate: (data: Record<string, unknown>) => void;
	}

	let { data, onUpdate }: Props = $props();

	let url = $state((data.url as string) ?? '');
	let description = $state((data.description as string) ?? '');
	let urlError = $state('');

	function getEmbedUrl(raw: string): string | null {
		const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
		if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
		const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
		if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
		return null;
	}

	const embedUrl = $derived(getEmbedUrl(url));

	function handleUrlChange() {
		if (url.trim() && !embedUrl) {
			urlError = 'Must be a YouTube or Vimeo URL.';
		} else { urlError = ''; }
		onUpdate({ url, description });
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-1.5">
		<label class="text-xs font-medium text-[var(--color-text-secondary)]">Video URL</label>
		<input
			bind:value={url}
			oninput={handleUrlChange}
			type="url"
			placeholder="https://youtube.com/watch?v=… or https://vimeo.com/…"
			class="w-full rounded-lg border border-[var(--color-surface-600)] bg-transparent
			       px-3 py-2 text-sm text-[var(--color-text-primary)]
			       placeholder:text-[var(--color-text-muted)] focus:outline-none
			       focus:border-[var(--color-accent-500)] transition-colors
			       {urlError ? 'border-[var(--color-error-400)]' : ''}"
		/>
		{#if urlError}<p class="text-xs text-[var(--color-error-400)]">{urlError}</p>{/if}
	</div>

	{#if embedUrl}
		<div class="relative w-full overflow-hidden rounded-xl border border-[var(--color-surface-700)]" style="padding-top: 56.25%;">
			<iframe src={embedUrl} title="Video preview" class="absolute inset-0 h-full w-full" frameborder="0" allowfullscreen></iframe>
		</div>
	{/if}

	<!-- Description — centered like image caption, below the video -->
	<div class="flex flex-col gap-1.5">
		<input
			bind:value={description}
			oninput={() => onUpdate({ url, description })}
			type="text"
			placeholder="Caption / description (optional)…"
			class="w-full bg-transparent text-sm text-center text-[var(--color-text-secondary)]
			       placeholder:text-[var(--color-text-muted)] focus:outline-none
			       border-b border-[var(--color-surface-700)] pb-1"
		/>
	</div>
</div>
