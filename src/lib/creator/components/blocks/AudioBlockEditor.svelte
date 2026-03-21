<script lang="ts">
	interface Props {
		data: Record<string, unknown>;
		blockId: string;
		onUpdate: (data: Record<string, unknown>) => void;
		onUpload: (file: File, blockId: string, fileType: 'image' | 'audio') => Promise<string>;
	}
	let { data, blockId, onUpdate, onUpload }: Props = $props();

	const label = $derived(typeof data.label === 'string' ? data.label : '');
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
			const url = await onUpload(file, blockId, 'audio');
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
		<audio controls src={previewUrl} class="w-full rounded-lg"></audio>
	{:else}
		<label class="flex flex-col items-center justify-center gap-2 rounded-xl border-2
		              border-dashed border-[var(--color-surface-600)] py-8 cursor-pointer
		              hover:border-[var(--color-accent-500)] transition-colors">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
			     class="text-[var(--color-text-muted)]">
				<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
			</svg>
			<span class="text-sm text-[var(--color-text-muted)]">{uploading ? 'Uploading…' : 'Click to upload audio'}</span>
			<input type="file" accept="audio/*" onchange={handleFileChange} class="hidden" disabled={uploading} />
		</label>
	{/if}
	{#if uploadError}<p class="text-xs text-[var(--color-error-400)]">{uploadError}</p>{/if}
	<input type="text" value={label}
		oninput={(e) => onUpdate({ ...data, label: (e.target as HTMLInputElement).value })}
		placeholder="Audio label…"
		class="w-full bg-transparent text-sm text-[var(--color-text-secondary)]
		       placeholder:text-[var(--color-text-muted)] focus:outline-none
		       border-b border-[var(--color-surface-700)] pb-1" />
	{#if previewUrl}
		<button onclick={handleRemove}
			class="self-start text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
			Remove audio
		</button>
	{/if}
</div>