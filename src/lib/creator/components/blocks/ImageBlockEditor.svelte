<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		blockId: string;
		onUpdate: (data: Record<string, unknown>) => void;
		onUpload: (file: File, blockId: string, fileType: 'image' | 'audio') => Promise<string>;
	}
	let { data, blockId, onUpdate, onUpload }: Props = $props();

	const caption = $derived(typeof data.caption === 'string' ? data.caption : '');
	const existingUrl = $derived(typeof data.url === 'string' ? data.url : '');
	let uploading = $state(false);
	let uploadError = $state('');
	let previewUrl = $state('');

	$effect(() => {
		if (existingUrl && !previewUrl) previewUrl = existingUrl;
	});

	async function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true; uploadError = '';
		try {
			const url = await onUpload(file, blockId, 'image');
			previewUrl = URL.createObjectURL(file);
			onUpdate({ ...data, url });
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed.';
		} finally { uploading = false; }
	}
	function handleRemove() { previewUrl = ''; onUpdate({ ...data, url: '' }); }
</script>
<div class="flex flex-col gap-3">
	{#if previewUrl}
		<img src={previewUrl} alt={caption || 'Uploaded image'}
			class="max-h-64 w-full rounded-lg object-cover border border-[var(--color-surface-700)]" />
	{:else}
		<label class="flex flex-col items-center justify-center gap-2 rounded-xl border-2
		              border-dashed border-[var(--color-surface-600)] py-10 cursor-pointer
		              hover:border-[var(--color-accent-500)] transition-colors">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
			     class="text-[var(--color-text-muted)]">
				<rect x="3" y="3" width="18" height="18" rx="2"/>
				<circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
			</svg>
			<span class="text-sm text-[var(--color-text-muted)]">{uploading ? 'Uploading…' : 'Click to upload image'}</span>
			<input type="file" accept="image/*" onchange={handleFileChange} class="hidden" disabled={uploading} />
		</label>
	{/if}
	{#if uploadError}<p class="text-xs text-[var(--color-error-400)]">{uploadError}</p>{/if}
	<input type="text" value={caption}
		oninput={(e) => onUpdate({ ...data, caption: (e.target as HTMLInputElement).value })}
		placeholder="Caption (optional)…"
		class="w-full bg-transparent text-sm text-[var(--color-text-secondary)]
		       placeholder:text-[var(--color-text-muted)] focus:outline-none
		       border-b border-[var(--color-surface-700)] pb-1" />
	{#if previewUrl}
		<button onclick={handleRemove}
			class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
			Remove image
		</button>
	{/if}
</div>