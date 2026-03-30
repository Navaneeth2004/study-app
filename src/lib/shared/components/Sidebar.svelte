<script lang="ts">
	import { page } from '$app/stores';
	import { roleStore } from '$lib/shared/stores/roleStore';
	import type { NavItem } from '$lib/shared/types/layoutTypes';
	import { unreadCountStore } from '$lib/notifications/notificationPoller';
	import { reviewDueCountStore } from '$lib/review/reviewDueCountStore';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	const viewerNav: NavItem[] = [
		{ href: '/viewer', label: 'Home', icon: 'home' },
		{ href: '/viewer/flashcards', label: 'Flashcard Decks', icon: 'cards' },
		{ href: '/review', label: 'Review', icon: 'review' },
		{ href: '/viewer/search', label: 'Search', icon: 'search' },
		{ href: '/bookmarks', label: 'Bookmarks', icon: 'bookmark' },
		{ href: '/profile', label: 'Profile', icon: 'profile' },
		{ href: '/notifications', label: 'Notifications', icon: 'bell' },
		{ href: '/calendar', label: 'Calendar', icon: 'calendar' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	];

	const creatorNav: NavItem[] = [
		{ href: '/creator', label: 'My Textbooks', icon: 'book' },
		{ href: '/creator/flashcards', label: 'Solo Flashcards', icon: 'cards' }
	];

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === '/viewer') return path === '/viewer';
		if (href === '/viewer/flashcards') return path.startsWith('/viewer/flashcards');
		if (href === '/review') return path.startsWith('/review');
		if (href === '/creator') {
			return path === '/creator' || path.startsWith('/creator/textbooks');
		}
		if (href === '/profile') return path === '/profile';
		return path.startsWith(href);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-20 bg-black/60 lg:hidden"
		role="button"
		tabindex="-1"
		aria-label="Close sidebar"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	></div>
{/if}

<aside
	class="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-[var(--color-surface-700)]
	       bg-[var(--color-surface-900)] transition-transform duration-300 lg:translate-x-0
	       {open ? 'translate-x-0' : '-translate-x-full'}"
>
	<!-- Logo -->
	<div class="flex h-16 items-center gap-3 border-b border-[var(--color-surface-700)] px-5">
		<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-500)]">
			<svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M3 4.5h12M3 9h8M3 13.5h5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
			</svg>
		</div>
		<span class="font-display text-base tracking-tight text-[var(--color-text-primary)]">StudyApp</span>
	</div>

	<nav class="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
		<!-- Viewer nav -->
		<div class="flex flex-col gap-1">
			{#each viewerNav as item}
				<a
					href={item.href}
					onclick={() => onClose()}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors
					       {isActive(item.href)
						? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]'}"
				>
					{#if item.icon === 'home'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
						</svg>
					{:else if item.icon === 'search'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
						</svg>
					{:else if item.icon === 'cards'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
						</svg>
					{:else if item.icon === 'review'}
						<div class="relative">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
								<path d="M12 6v6l4 2"/>
							</svg>
							{#if $reviewDueCountStore > 0}
								<span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full
								            bg-[var(--color-error-500)] text-white text-[10px] font-bold leading-none">
									{$reviewDueCountStore > 9 ? '9+' : $reviewDueCountStore}
								</span>
							{/if}
						</div>
					{:else if item.icon === 'bookmark'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
						</svg>
					{:else if item.icon === 'calendar'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
					{:else if item.icon === 'profile'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
						</svg>
					{:else if item.icon === 'bell'}
						<div class="relative">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
								<path d="M13.73 21a2 2 0 01-3.46 0"/>
							</svg>
							{#if $unreadCountStore > 0}
								<span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full
								            bg-[var(--color-accent-500)] text-white text-[10px] font-bold leading-none">
									{$unreadCountStore > 9 ? '9+' : $unreadCountStore}
								</span>
							{/if}
						</div>
					{:else if item.icon === 'settings'}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
						</svg>
					{/if}
					{item.label}
				</a>
			{/each}
		</div>

		<!-- Creator nav — only visible in creator mode -->
		{#if $roleStore === 'creator'}
			<div class="flex flex-col gap-1">
				<span class="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
					Creator
				</span>
				{#each creatorNav as item}
					<a
						href={item.href}
						onclick={() => onClose()}
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors
						       {isActive(item.href)
							? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
							: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-800)] hover:text-[var(--color-text-primary)]'}"
					>
						{#if item.icon === 'book'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
							</svg>
						{:else if item.icon === 'cards'}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<rect x="2" y="4" width="14" height="10" rx="2"/><rect x="8" y="10" width="14" height="10" rx="2"/>
							</svg>
						{/if}
						{item.label}
					</a>
				{/each}
			</div>
		{/if}
	</nav>

	<!-- Role badge -->
	<div class="border-t border-[var(--color-surface-700)] p-4">
		<div class="flex items-center gap-2 rounded-lg bg-[var(--color-surface-800)] px-3 py-2">
			<div
				class="h-2 w-2 rounded-full
				       {$roleStore === 'creator' ? 'bg-[var(--color-success-500)]' : 'bg-[var(--color-text-muted)]'}"
			></div>
			<span class="text-xs font-medium text-[var(--color-text-secondary)]">
				{$roleStore === 'creator' ? 'Creator' : 'Viewer'}
			</span>
		</div>
	</div>
</aside>
