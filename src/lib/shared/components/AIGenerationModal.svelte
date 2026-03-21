<script lang="ts">
	import { onMount } from 'svelte';
	import { generateContent } from '$lib/ai/aiService';
	import { getKey, getAvailableProviders } from '$lib/settings/aiKeyStore';
	import type { AIProvider, AIOutputType, AIGenerationResult } from '$lib/ai/aiTypes';

	interface Props {
		isOpen: boolean;
		outputType: AIOutputType;
		existingContent?: string;
		onInsert: (result: AIGenerationResult) => void;
		onClose: () => void;
	}

	let { isOpen, outputType, existingContent = '', onInsert, onClose }: Props = $props();

	const OUTPUT_LABELS: Record<AIOutputType, string> = {
		paragraph: 'Paragraph',
		bullet_list: 'Bullet List',
		table: 'Table',
		flashcards: 'Flashcards'
	};

	const PROVIDER_LABELS: Record<AIProvider, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		gemini: 'Gemini',
		groq: 'Groq'
	};

	const IMAGE_PROVIDERS: AIProvider[] = ['openai', 'anthropic'];

	let availableProviders = $state<AIProvider[]>([]);
	let selectedProvider = $state<AIProvider | null>(null);
	let prompt = $state('');
	let flashcardCount = $state(10);
	let existingDraft = $state(existingContent);
	let showExisting = $state(!!existingContent);
	let imageBase64 = $state('');
	let generating = $state(false);
	let result = $state<AIGenerationResult | null>(null);
	let error = $state('');

	const supportsImage = $derived(
		selectedProvider !== null && IMAGE_PROVIDERS.includes(selectedProvider)
	);

	onMount(() => {
		availableProviders = getAvailableProviders();
		if (availableProviders.length > 0) selectedProvider = availableProviders[0];
	});

	async function handleGenerate() {
		if (!selectedProvider || !prompt.trim()) return;
		generating = true;
		error = '';
		result = null;
		try {
			result = await generateContent({
				provider: selectedProvider,
				apiKey: getKey(selectedProvider),
				prompt: prompt.trim(),
				existingContent: existingDraft.trim() || undefined,
				referenceImage: imageBase64 || undefined,
				outputType,
				flashcardCount: outputType === 'flashcards' ? flashcardCount : undefined
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Generation failed.';
		} finally {
			generating = false;
		}
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			imageBase64 = dataUrl.split(',')[1] ?? '';
		};
		reader.readAsDataURL(file);
	}

	function handleInsert() {
		if (!result) return;
		onInsert(result);
		onClose();
	}

	function getFlashcards(): Array<{ front_text: string; back_text: string }> {
		if (!result || result.outputType !== 'flashcards') return [];
		const cards = result.data.flashcards;
		if (!Array.isArray(cards)) return [];
		return cards as Array<{ front_text: string; back_text: string }>;
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.75);"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative flex w-full max-w-xl flex-col rounded-2xl border
			       border-[var(--color-surface-700)] bg-[var(--color-surface-950)] shadow-2xl"
			style="max-height: 90vh;"
		>
			<!-- Header -->
			<div class="flex shrink-0 items-center justify-between border-b
			            border-[var(--color-surface-700)] px-5 py-4">
				<div class="flex flex-col gap-0.5">
					<span class="text-sm font-semibold text-[var(--color-text-primary)]">Generate with AI</span>
					<span class="text-xs text-[var(--color-text-muted)]">
						Generating: {OUTPUT_LABELS[outputType]}
					</span>
				</div>
				<button
					onclick={onClose}
					aria-label="Close"
					class="flex h-7 w-7 items-center justify-center rounded-lg
					       text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)]
					       hover:text-[var(--color-text-primary)] transition-colors"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<!-- Scrollable body -->
			<div class="flex flex-col gap-4 overflow-y-auto p-5">

				{#if availableProviders.length === 0}
					<div class="rounded-xl border border-[var(--color-surface-700)]
					            bg-[var(--color-surface-900)] px-4 py-6 text-center">
						<p class="mb-2 text-sm text-[var(--color-text-secondary)]">No API keys configured.</p>
						<a
							href="/settings"
							onclick={onClose}
							class="text-sm text-[var(--color-accent-400)] hover:text-[var(--color-accent-300)] transition-colors"
						>
							Add an API key in Settings → AI Settings
						</a>
					</div>

				{:else}
					<!-- Provider selector -->
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-[var(--color-text-secondary)]">Provider</span>
						<div class="flex flex-wrap gap-2">
							{#each availableProviders as p}
								<button
									onclick={() => (selectedProvider = p)}
									class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
									       {selectedProvider === p
										? 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 text-[var(--color-accent-400)]'
										: 'border-[var(--color-surface-600)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
								>
									{PROVIDER_LABELS[p]}
								</button>
							{/each}
						</div>
					</div>

					<!-- Prompt -->
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium text-[var(--color-text-secondary)]">Prompt</label>
						<textarea
							bind:value={prompt}
							placeholder="Describe what you want to generate…"
							rows={3}
							class="w-full resize-none rounded-xl border border-[var(--color-surface-600)]
							       bg-[var(--color-surface-800)] px-3 py-2 text-sm
							       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
							       focus:border-[var(--color-accent-500)] focus:outline-none
							       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
						></textarea>
					</div>

					<!-- Flashcard count (flashcards only) -->
					{#if outputType === 'flashcards'}
						<div class="flex flex-col gap-1.5">
							<label class="text-xs font-medium text-[var(--color-text-secondary)]">
								How many cards?
							</label>
							<input
								type="number"
								bind:value={flashcardCount}
								min={1}
								max={50}
								class="w-24 rounded-xl border border-[var(--color-surface-600)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm
								       text-[var(--color-text-primary)] focus:border-[var(--color-accent-500)]
								       focus:outline-none transition-colors"
							/>
						</div>
					{/if}

					<!-- Existing content (collapsible) -->
					<div class="flex flex-col gap-1.5">
						<button
							type="button"
							onclick={() => (showExisting = !showExisting)}
							class="flex items-center gap-1.5 self-start text-xs
							       text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								{#if showExisting}
									<polyline points="18 15 12 9 6 15"/>
								{:else}
									<polyline points="6 9 12 15 18 9"/>
								{/if}
							</svg>
							Existing content to rewrite
						</button>
						{#if showExisting}
							<textarea
								bind:value={existingDraft}
								placeholder="Paste existing content here…"
								rows={3}
								class="w-full resize-none rounded-xl border border-[var(--color-surface-600)]
								       bg-[var(--color-surface-800)] px-3 py-2 text-sm
								       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
								       focus:border-[var(--color-accent-500)] focus:outline-none
								       focus:ring-2 focus:ring-[var(--color-accent-500)]/20 transition-colors"
							></textarea>
						{/if}
					</div>

					<!-- Image attachment (OpenAI + Anthropic only) -->
					{#if supportsImage}
						<div class="flex flex-col gap-1.5">
							{#if imageBase64}
								<div class="flex items-center gap-3">
									<img
										src="data:image/jpeg;base64,{imageBase64}"
										alt="Reference"
										class="h-14 w-14 rounded-lg border border-[var(--color-surface-700)] object-cover"
									/>
									<button
										type="button"
										onclick={() => (imageBase64 = '')}
										class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors"
									>
										Remove image
									</button>
								</div>
							{:else}
								<label class="flex cursor-pointer items-center gap-1.5 self-start text-xs
								              text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="3" width="18" height="18" rx="2"/>
										<circle cx="8.5" cy="8.5" r="1.5"/>
										<polyline points="21 15 16 10 5 21"/>
									</svg>
									Attach reference image
									<input type="file" accept="image/*" onchange={handleImageChange} class="hidden" />
								</label>
							{/if}
						</div>
					{/if}

					<!-- Generate button -->
					<button
						type="button"
						onclick={handleGenerate}
						disabled={generating || !prompt.trim() || !selectedProvider}
						class="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-500)]
						       px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-400)]
						       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
					>
						{#if generating}
							<svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<path d="M21 12a9 9 0 11-6.219-8.56"/>
							</svg>
							Generating…
						{:else if result}
							Regenerate
						{:else}
							Generate
						{/if}
					</button>

					<!-- Error -->
					{#if error}
						<p class="text-sm text-[var(--color-error-400)]">{error}</p>
					{/if}

					<!-- Result preview -->
					{#if result}
						<div class="flex flex-col gap-3 rounded-xl border border-[var(--color-surface-700)]
						            bg-[var(--color-surface-900)] p-4">
							<span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
								Preview
							</span>

							{#if result.outputType === 'paragraph'}
								<p class="text-sm leading-relaxed text-[var(--color-text-primary)]">
									{@html String(result.data.html ?? '')}
								</p>

							{:else if result.outputType === 'bullet_list'}
								<ul class="flex flex-col gap-1.5">
									{#each (result.data.items as string[] ?? []) as item}
										<li class="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
											<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-500)]"></span>
											{item}
										</li>
									{/each}
								</ul>

							{:else if result.outputType === 'table'}
								<div class="overflow-x-auto">
									<table class="w-full text-sm">
										<thead>
											<tr>
												{#each (result.data.headers as string[] ?? []) as h}
													<th class="border-b border-[var(--color-surface-700)] px-3 py-1.5 text-left
													           text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
														{h}
													</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each (result.data.rows as string[][] ?? []) as row}
												<tr>
													{#each row as cell}
														<td class="border-b border-[var(--color-surface-700)]/50 px-3 py-1.5
														           text-[var(--color-text-primary)]">
															{cell}
														</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>

							{:else if result.outputType === 'flashcards'}
								{@const cards = getFlashcards()}
								<p class="text-xs text-[var(--color-text-muted)]">
									{cards.length} {cards.length !== 1 ? 'cards' : 'card'} generated
								</p>
								<div class="flex max-h-48 flex-col gap-2 overflow-y-auto">
									{#each cards as card, i}
										<div class="rounded-lg border border-[var(--color-surface-700)]
										            bg-[var(--color-surface-800)] px-3 py-2">
											<p class="mb-0.5 text-xs font-semibold text-[var(--color-text-muted)]">#{i + 1}</p>
											<p class="text-xs text-[var(--color-text-secondary)]">
												<span class="text-[var(--color-text-muted)]">Front:</span> {card.front_text}
											</p>
											<p class="text-xs text-[var(--color-text-secondary)]">
												<span class="text-[var(--color-text-muted)]">Back:</span> {card.back_text}
											</p>
										</div>
									{/each}
								</div>
							{/if}

							<button
								type="button"
								onclick={handleInsert}
								class="self-start rounded-xl bg-[var(--color-accent-500)] px-4 py-2 text-sm
								       font-medium text-white hover:bg-[var(--color-accent-400)] transition-colors"
							>
								Insert
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
