<script lang="ts">
	/**
	 * Full-screen zoom + pan modal for any image.
	 * Click backdrop or press Escape to close.
	 * Scroll wheel to zoom. Click-drag to pan.
	 */
	interface Props {
		src: string;
		alt?: string;
		onClose: () => void;
	}

	let { src, alt = 'Image', onClose }: Props = $props();

	let scale = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let dragging = $state(false);
	let lastX = 0;
	let lastY = 0;
	let imgEl: HTMLImageElement;

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.15 : 0.15;
		scale = Math.min(8, Math.max(0.5, scale + delta));
	}

	function onMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
		e.preventDefault();
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging) return;
		offsetX += e.clientX - lastX;
		offsetY += e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
	}

	function onMouseUp() { dragging = false; }

	function reset() { scale = 1; offsetX = 0; offsetY = 0; }

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === '0') reset();
	}

	// Touch support
	let lastTouchDist = 0;
	let touchStartX = 0;
	let touchStartY = 0;

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			lastTouchDist = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
		} else if (e.touches.length === 1) {
			dragging = true;
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		}
	}

	function onTouchMove(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 2) {
			const dist = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
			scale = Math.min(8, Math.max(0.5, scale * (dist / lastTouchDist)));
			lastTouchDist = dist;
		} else if (e.touches.length === 1 && dragging) {
			offsetX += e.touches[0].clientX - touchStartX;
			offsetY += e.touches[0].clientY - touchStartY;
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		}
	}

	function onTouchEnd() { dragging = false; }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
	<!-- Controls -->
	<div class="absolute top-4 right-4 flex items-center gap-2 z-10">
		<button onclick={reset}
			class="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-xs text-white/80 hover:bg-black/70 transition-colors">
			Reset
		</button>
		<button onclick={onClose}
			class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
			aria-label="Close">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<!-- Zoom hint -->
	<p class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 select-none">
		Scroll to zoom · Drag to pan · Press 0 to reset
	</p>

	<!-- Image -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="overflow-hidden select-none"
		style="cursor: {dragging ? 'grabbing' : 'grab'};"
		onwheel={onWheel}
		onmousedown={onMouseDown}
		onmousemove={onMouseMove}
		onmouseup={onMouseUp}
		onmouseleave={onMouseUp}
		ontouchstart={onTouchStart}
		ontouchmove={onTouchMove}
		ontouchend={onTouchEnd}
	>
		<img
			bind:this={imgEl}
			{src}
			{alt}
			draggable="false"
			style="
				transform: translate({offsetX}px, {offsetY}px) scale({scale});
				transform-origin: center center;
				transition: {dragging ? 'none' : 'transform 0.1s ease'};
				max-width: 90vw;
				max-height: 90vh;
				object-fit: contain;
				display: block;
			"
		/>
	</div>
</div>
