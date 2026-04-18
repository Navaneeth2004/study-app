<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Sidebar from '$lib/shared/components/Sidebar.svelte';
	import TopBar from '$lib/shared/components/TopBar.svelte';
	import NotificationPermissionBanner from '$lib/shared/components/NotificationPermissionBanner.svelte';
	import GlobalAudioPlayer from '$lib/audio/components/GlobalAudioPlayer.svelte';
	import { startPolling, stopPolling } from '$lib/notifications/notificationPoller';
	import { startReviewPolling, stopReviewPolling } from '$lib/review/reviewDueCountStore';
	import { getMyProfile } from '$lib/profile/profileService';

	interface Props { children: import('svelte').Snippet; }
	let { children }: Props = $props();

	let sidebarOpen = $state(false);
	function toggleSidebar() { sidebarOpen = !sidebarOpen; }
	function closeSidebar()  { sidebarOpen = false; }

	onMount(() => {
		startPolling();
		startReviewPolling();
		if (!$page.url.pathname.startsWith('/profile/setup')) {
			getMyProfile().then((profile) => {
				if (!profile.profileSetupDone) goto('/profile/setup');
			}).catch(() => {});
		}
		return () => { stopPolling(); stopReviewPolling(); };
	});
</script>

<div class="min-h-screen bg-[var(--color-surface-950)]">
	<Sidebar open={sidebarOpen} onClose={closeSidebar} />
	<TopBar onMenuToggle={toggleSidebar} />
	<NotificationPermissionBanner />

	<main class="pt-16 lg:pl-64">
		<div class="p-6">
			{@render children()}
		</div>
	</main>

	<!-- Global persistent audio player -->
	<GlobalAudioPlayer />
</div>
