<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { playerTrackStore, closeTrack } from '$lib/audio/audioStore';
	import type { PlayerTrack } from '$lib/audio/audioTypes';
	import { TEMPLATE_META } from '$lib/audio/audioTypes';
	import { playBrowserTTS, type BrowserTTSHandle } from '$lib/audio/audioConversionService';
	import { getBrowserVoice1Idx, getBrowserVoice2Idx } from '$lib/audio/audioKeyStore';

	let track    = $state<PlayerTrack | null>(null);
	let playing  = $state(false);
	let volume   = $state(1.0);
	let speed    = $state(1.0);
	let elapsed  = $state(0);
	let duration = $state(0);
	let segIdx   = $state(0);
	let handle   = $state<BrowserTTSHandle | null>(null);
	let audioEl  = $state<HTMLAudioElement | undefined>(undefined);
	let expanded = $state(false);
	let transcriptEl = $state<HTMLDivElement | undefined>(undefined);
	let rafId = 0;

	const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
	const SKIP_S = 15;

	const unsubscribe = playerTrackStore.subscribe((t) => {
		stopAll();
		playing = false; elapsed = 0; segIdx = 0;
		track   = t;
		if (t) { expanded = false; startPlayback(t); }
	});

	function stopAll() {
		handle?.stop(); handle = null;
		if (audioEl) audioEl.pause();
		cancelAnimationFrame(rafId);
	}

	function startPlayback(t: PlayerTrack) {
		playing = true;
		if (t.audio.audioUrl) {
			duration = t.audio.duration || 0;
			// autoplay handled by bind + $effect
		} else {
			launchBrowserTTS(t, 0);
		}
	}

	function launchBrowserTTS(t: PlayerTrack, fromSeg: number) {
		handle = playBrowserTTS(
			t.audio.script,
			getBrowserVoice1Idx(), getBrowserVoice2Idx(),
			speed, fromSeg,
			(i) => {
				segIdx = i;
				scrollToSeg(i);
			},
			() => { playing = false; }
		);
	}

	function scrollToSeg(i: number) {
		tick().then(() => {
			if (!transcriptEl) return;
			const el = transcriptEl.querySelector(`[data-seg="${i}"]`) as HTMLElement | null;
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}

	function togglePlay() {
		if (!track) return;
		if (track.audio.audioUrl) {
			if (playing) { audioEl?.pause(); playing = false; }
			else         { audioEl?.play();  playing = true;  }
		} else {
			if (playing) { handle?.stop(); handle = null; playing = false; }
			else         { playing = true; launchBrowserTTS(track, segIdx); }
		}
	}

	function skipAPI(delta: number) {
		if (!audioEl) return;
		audioEl.currentTime = Math.max(0, Math.min(duration, audioEl.currentTime + delta));
	}

	function skipSeg(delta: number) {
		if (!track) return;
		const total = track.audio.script.segments.length;
		const next  = Math.max(0, Math.min(total - 1, segIdx + delta));
		handle?.stop(); handle = null;
		segIdx = next;
		if (playing) launchBrowserTTS(track, next);
	}

	function handleSkipBack()    { track?.audio.audioUrl ? skipAPI(-SKIP_S)  : skipSeg(-1); }
	function handleSkipForward() { track?.audio.audioUrl ? skipAPI(+SKIP_S)  : skipSeg(+1); }

	function handleTimeUpdate() {
		if (!audioEl) return;
		elapsed  = audioEl.currentTime;
		duration = audioEl.duration || 0;
		// estimate current segment for API audio
		if (track && duration > 0) {
			const total = track.audio.script.segments.length;
			const est   = Math.floor((elapsed / duration) * total);
			if (est !== segIdx) { segIdx = est; scrollToSeg(est); }
		}
	}

	function handleSeek(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		if (track?.audio.audioUrl && audioEl) { audioEl.currentTime = val; elapsed = val; }
	}

	function handleVolumeChange(e: Event) {
		volume = parseFloat((e.target as HTMLInputElement).value);
		if (audioEl) audioEl.volume = volume;
	}

	function cycleSpeed() {
		const idx = SPEEDS.indexOf(speed);
		speed     = SPEEDS[(idx + 1) % SPEEDS.length];
		if (audioEl) audioEl.playbackRate = speed;
	}

	function handleClose() {
		stopAll();
		expanded = false;
		closeTrack();
	}

	function fmt(s: number): string {
		if (!isFinite(s)) return '0:00';
		const m = Math.floor(s / 60);
		return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
	}

	onDestroy(() => { unsubscribe(); stopAll(); });

	const isBrowser  = $derived(!track?.audio.audioUrl);
	const meta       = $derived(track ? TEMPLATE_META[track.audio.template] : null);
	const totalSegs  = $derived(track?.audio.script.segments.length ?? 0);
	const timeLeft   = $derived(duration > 0 ? fmt(duration - elapsed) : '');
	const timeCur    = $derived(fmt(elapsed));

	function speakerColor(spk: string) {
		if (spk === 'host')     return 'var(--color-success-500)';
		if (spk === 'guest')    return 'var(--color-accent-400)';
		return 'var(--color-text-muted)';
	}
	function speakerLabel(spk: string) {
		if (spk === 'host')  return 'H';
		if (spk === 'guest') return 'G';
		return 'N';
	}
</script>

{#if track}
	<!-- Hidden audio element for API audio -->
	{#if !isBrowser}
		<!-- svelte-ignore a11y_media_has_caption -->
		<audio bind:this={audioEl} src={track.audio.audioUrl}
		       autoplay={playing}
		       playbackRate={speed}
		       volume={volume}
		       ontimeupdate={handleTimeUpdate}
		       onended={() => { playing = false; elapsed = duration; }}
		       style="display:none;"></audio>
	{/if}

	<!-- ── FULLSCREEN / EXPANDED VIEW ─────────────────────────────────────── -->
	{#if expanded}
		<div class="fixed inset-0 z-[55] flex flex-col bg-[var(--color-surface-950)]">
			<!-- Top bar -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-surface-700)]">
				<div class="flex items-center gap-3">
					<span class="text-2xl">{meta?.emoji ?? '🔊'}</span>
					<div>
						<p class="text-sm font-semibold text-[var(--color-text-primary)]">{track.chapterTitle}</p>
						<p class="text-xs text-[var(--color-text-muted)]">{meta?.label ?? ''} · {track.audio.ttsProvider}</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button onclick={() => (expanded = false)} aria-label="Minimize"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>
					</button>
					<button onclick={handleClose} aria-label="Close player"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-error-400)] transition-colors">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>

			<!-- Transcript -->
			<div bind:this={transcriptEl} class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
				{#each track.audio.script.segments as seg, i}
					<div data-seg={i}
					     class="flex gap-3 rounded-xl p-3 transition-colors {i === segIdx
					     	? 'bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/40'
					     	: 'border border-transparent'}">
						<span class="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
						      style="background: color-mix(in srgb, {speakerColor(seg.speaker)} 20%, transparent);
						             color: {speakerColor(seg.speaker)};">
							{speakerLabel(seg.speaker)}
						</span>
						<p class="text-sm leading-relaxed {i === segIdx ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}">{seg.text}</p>
					</div>
				{/each}
			</div>

			<!-- Controls -->
			<div class="border-t border-[var(--color-surface-700)] px-5 py-4 flex flex-col gap-3">
				<!-- Seek bar (API) / segment bar (browser) -->
				{#if !isBrowser}
					<div class="flex items-center gap-3">
						<span class="text-xs text-[var(--color-text-muted)] w-10 text-right">{timeCur}</span>
						<input type="range" min="0" max={duration || 100} step="0.1" value={elapsed}
						       oninput={handleSeek} class="flex-1 h-1.5 accent-[var(--color-accent-500)] cursor-pointer" />
						<span class="text-xs text-[var(--color-text-muted)] w-10">-{timeLeft}</span>
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<span class="text-xs text-[var(--color-text-muted)]">Seg {segIdx + 1}/{totalSegs}</span>
						<div class="flex-1 h-1.5 rounded-full bg-[var(--color-surface-700)] overflow-hidden">
							<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all"
							     style="width:{totalSegs > 0 ? ((segIdx+1)/totalSegs)*100 : 0}%"></div>
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-between">
					<!-- Skip back -->
					<button onclick={handleSkipBack} aria-label="Skip back"
						class="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-800)] transition-colors">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
						</svg>
					</button>

					<!-- Play / Pause -->
					<button onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
						class="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-400)] transition-colors">
						{#if playing}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
						{/if}
					</button>

					<!-- Skip forward -->
					<button onclick={handleSkipForward} aria-label="Skip forward"
						class="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-800)] transition-colors">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
						</svg>
					</button>
				</div>

				<div class="flex items-center justify-between gap-4">
					<!-- Speed -->
					<button onclick={cycleSpeed}
						class="rounded-lg border border-[var(--color-surface-600)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
						{speed}x
					</button>
					<!-- Volume -->
					{#if !isBrowser}
						<div class="flex items-center gap-2 flex-1">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-[var(--color-text-muted)] shrink-0">
								<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
							</svg>
							<input type="range" min="0" max="1" step="0.05" value={volume}
							       oninput={handleVolumeChange}
							       class="flex-1 h-1 accent-[var(--color-accent-500)] cursor-pointer" />
						</div>
					{/if}
					{#if isBrowser}
						<span class="text-xs text-[var(--color-text-muted)]">Browser TTS</span>
					{/if}
				</div>
			</div>
		</div>

	{:else}
		<!-- ── MINI BOTTOM BAR ──────────────────────────────────────────────── -->
		<div class="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-surface-700)]
		            bg-[var(--color-surface-900)]/95 backdrop-blur-sm px-4 py-2">
			<!-- Seek bar on top -->
			{#if !isBrowser}
				<input type="range" min="0" max={duration || 100} step="0.1" value={elapsed}
				       oninput={handleSeek}
				       class="w-full h-1 accent-[var(--color-accent-500)] cursor-pointer mb-2 block" style="margin:0 0 6px 0;" />
			{:else}
				<div class="w-full h-1 rounded-full bg-[var(--color-surface-700)] overflow-hidden mb-2">
					<div class="h-full rounded-full bg-[var(--color-accent-500)] transition-all"
					     style="width:{totalSegs > 0 ? ((segIdx+1)/totalSegs)*100 : 0}%;"></div>
				</div>
			{/if}

			<div class="flex items-center gap-3 max-w-4xl mx-auto">
				<!-- Track info + expand -->
				<button onclick={() => (expanded = true)}
					class="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
					<span class="text-lg shrink-0">{meta?.emoji ?? '🔊'}</span>
					<div class="min-w-0">
						<p class="text-xs font-medium text-[var(--color-text-primary)] truncate">{track.chapterTitle}</p>
						<p class="text-[10px] text-[var(--color-text-muted)]">
							{meta?.label} ·
							{#if !isBrowser}{timeCur} / {fmt(duration)}{:else}Seg {segIdx+1}/{totalSegs}{/if}
						</p>
					</div>
				</button>

				<!-- Controls -->
				<div class="flex items-center gap-1 shrink-0">
					<!-- Skip back -->
					<button onclick={handleSkipBack} aria-label="Skip back"
						class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
						</svg>
					</button>

					<!-- Play / Pause -->
					<button onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
						class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-500)] hover:bg-[var(--color-accent-400)] transition-colors">
						{#if playing}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
						{:else}
							<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
						{/if}
					</button>

					<!-- Skip forward -->
					<button onclick={handleSkipForward} aria-label="Skip forward"
						class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
						</svg>
					</button>

					<!-- Speed -->
					<button onclick={cycleSpeed}
						class="rounded-lg border border-[var(--color-surface-600)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
						{speed}x
					</button>

					<!-- Expand -->
					<button onclick={() => (expanded = true)} aria-label="Expand player"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
					</button>

					<!-- Close -->
					<button onclick={handleClose} aria-label="Close"
						class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] transition-colors">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
