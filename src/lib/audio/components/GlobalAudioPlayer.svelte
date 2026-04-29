<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { playerTrackStore, closeTrack } from '$lib/audio/audioStore';
	import { playBrowserTTS, getBrowserVoices } from '$lib/audio/audioConversionService';
	import { getBrowserVoice1Idx, getBrowserVoice2Idx } from '$lib/audio/audioKeyStore';
	import type { AudioScript } from '$lib/audio/audioTypes';

	const SPEEDS = [0.75, 1, 1.15, 1.25, 1.5, 2] as const;
	type Speed = (typeof SPEEDS)[number];

	let track        = $state<import('$lib/audio/audioTypes').PlayerTrack | null>(null);
	let playing      = $state(false);
	let speed        = $state<Speed>(1);
	let currentSeg   = $state(0);
	let pinned       = $state(false);
	let audioEl      = $state<HTMLAudioElement | null>(null);
	let browserHandle: { stop: () => void; isActive: () => boolean } | null = null;
	let browserVoices = $state<SpeechSynthesisVoice[]>([]);

	const isBrowser = $derived(track?.audio.ttsProvider === 'browser');
	const hasAudioFile = $derived(!!track?.audio.audioUrl);
	const totalSegs = $derived(track?.audio.script.segments.length ?? 0);

	// Subscribe to store
	const unsub = playerTrackStore.subscribe((t) => {
		if (t !== track) {
			stopAll();
			track = t;
			currentSeg = 0;
			playing = false;
			if (t) pinned = true;
		}
	});

	onMount(() => {
		browserVoices = getBrowserVoices();
		if (browserVoices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.addEventListener('voiceschanged', () => {
				browserVoices = getBrowserVoices();
			}, { once: true });
		}
	});

	onDestroy(() => {
		unsub();
		stopAll();
	});

	function stopAll() {
		browserHandle?.stop();
		browserHandle = null;
		if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
	}

	function startBrowserTTS(fromSeg = 0) {
		if (!track) return;
		browserHandle?.stop();
		playing = true;
		currentSeg = fromSeg;
		browserHandle = playBrowserTTS(
			track.audio.script,
			getBrowserVoice1Idx(),
			getBrowserVoice2Idx(),
			speed,
			fromSeg,
			(idx) => { currentSeg = idx; },
			() => { playing = false; currentSeg = 0; }
		);
	}

	function togglePlay() {
		if (!track) return;
		if (isBrowser) {
			if (playing) {
				browserHandle?.stop();
				browserHandle = null;
				playing = false;
			} else {
				startBrowserTTS(currentSeg);
			}
		} else if (audioEl) {
			if (playing) { audioEl.pause(); playing = false; }
			else { audioEl.play(); playing = true; }
		}
	}

	function prevSeg() {
		if (!track) return;
		const newSeg = Math.max(0, currentSeg - 1);
		if (isBrowser) {
			startBrowserTTS(newSeg);
		} else if (audioEl) {
			audioEl.currentTime = 0;
		}
		currentSeg = newSeg;
	}

	function nextSeg() {
		if (!track) return;
		const newSeg = Math.min(totalSegs - 1, currentSeg + 1);
		if (isBrowser) {
			startBrowserTTS(newSeg);
		}
		currentSeg = newSeg;
	}

	function cycleSpeed() {
		const idx = SPEEDS.indexOf(speed);
		const nextIdx = (idx + 1) % SPEEDS.length;
		speed = SPEEDS[nextIdx];

		if (isBrowser && playing) {
			// Restart TTS with new speed from current segment
			startBrowserTTS(currentSeg);
		} else if (audioEl) {
			audioEl.playbackRate = speed;
		}
	}

	function handleClose() {
		stopAll();
		playing = false;
		closeTrack();
	}

	// Format speed label
	function speedLabel(s: Speed): string {
		return s === 1 ? '1x' : `${s}x`;
	}

	// Get segment display text (truncated)
	const currentSegText = $derived(
		track?.audio.script.segments[currentSeg]?.text.slice(0, 80) ?? ''
	);
</script>

{#if track}
	<!-- Fixed bottom bar — sits above page content, no inner scrollbars -->
	<div class="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)]/95 backdrop-blur-sm lg:left-64">

		<!-- Hidden audio element for file-based playback -->
		{#if hasAudioFile}
			<!-- svelte-ignore a11y_media_has_caption -->
			<audio
				bind:this={audioEl}
				src={track.audio.audioUrl}
				onplay={() => (playing = true)}
				onpause={() => (playing = false)}
				onended={() => { playing = false; currentSeg = 0; }}
				ontimeupdate={() => {
					if (!audioEl || !track) return;
					const dur = track.audio.duration;
					if (dur > 0) {
						const pct = audioEl.currentTime / dur;
						currentSeg = Math.min(totalSegs - 1, Math.floor(pct * totalSegs));
					}
				}}
			></audio>
		{/if}

		<div class="flex flex-col px-4 py-3 gap-2">
			<!-- Top row: title + controls -->
			<div class="flex items-center gap-3">
				<!-- Track info — cursor pointer because clicking could navigate -->
				<div class="flex flex-col min-w-0 flex-1 cursor-pointer" role="button" tabindex="0"
				     onclick={() => { /* could navigate to chapter */ }}
				     onkeydown={(e) => e.key === 'Enter' && void 0}>
					<span class="text-sm font-medium text-[var(--color-text-primary)] truncate hover:text-[var(--color-accent-400)] transition-colors">
						{track.chapterTitle}
					</span>
					{#if track.textbookTitle}
						<span class="text-xs text-[var(--color-text-muted)] truncate">{track.textbookTitle} · {track.audio.template}</span>
					{:else}
						<span class="text-xs text-[var(--color-text-muted)]">{track.audio.template} · {isBrowser ? 'Browser TTS' : track.audio.ttsProvider}</span>
					{/if}
				</div>

				<!-- Controls -->
				<div class="flex items-center gap-2 shrink-0">
					<!-- Prev segment -->
					<button onclick={prevSeg} disabled={currentSeg === 0} aria-label="Previous segment"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
						       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
						       disabled:opacity-30 transition-colors">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
						</svg>
					</button>

					<!-- Play/Pause -->
					<button onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
						class="flex h-10 w-10 items-center justify-center rounded-full
						       bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-400)] transition-colors">
						{#if playing}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<polygon points="5 3 19 12 5 21 5 3"/>
							</svg>
						{/if}
					</button>

					<!-- Next segment -->
					<button onclick={nextSeg} disabled={currentSeg >= totalSegs - 1} aria-label="Next segment"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
						       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]
						       disabled:opacity-30 transition-colors">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
						</svg>
					</button>

					<!-- Speed button — cycles through speeds, WORKING -->
					<button onclick={cycleSpeed} aria-label="Change speed"
						class="flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg border border-[var(--color-surface-600)]
						       px-2 text-xs font-medium text-[var(--color-text-secondary)]
						       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
						{speedLabel(speed)}
					</button>

					<!-- Close -->
					<button onclick={handleClose} aria-label="Close player"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]
						       hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Progress / segment indicator -->
			{#if totalSegs > 0}
				<div class="flex items-center gap-3">
					<span class="shrink-0 text-[10px] text-[var(--color-text-muted)]">Seg {currentSeg + 1}/{totalSegs}</span>
					<div class="flex-1 h-1 rounded-full bg-[var(--color-surface-700)] overflow-hidden">
						<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300"
						     style="width:{((currentSeg + 1) / totalSegs) * 100}%"></div>
					</div>
					<span class="shrink-0 text-[10px] text-[var(--color-text-muted)]">
						{isBrowser ? 'Browser TTS' : track.audio.ttsProvider}
					</span>
				</div>
				<!-- Current segment text preview -->
				{#if currentSegText}
					<p class="text-xs text-[var(--color-text-muted)] truncate italic">
						"{currentSegText}{track.audio.script.segments[currentSeg]?.text.length > 80 ? '…' : ''}"
					</p>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Bottom padding so content isn't hidden behind player -->
	<div class="h-28 lg:hidden"></div>
	<div class="hidden lg:block h-28"></div>
{/if}
