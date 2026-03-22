<script lang="ts">
	import Sidebar from '$lib/shared/components/Sidebar.svelte';
	import TopBar from '$lib/shared/components/TopBar.svelte';
	import NotificationPermissionBanner from '$lib/shared/components/NotificationPermissionBanner.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let sidebarOpen = $state(false);
	function toggleSidebar() { sidebarOpen = !sidebarOpen; }
	function closeSidebar() { sidebarOpen = false; }
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
</div>
