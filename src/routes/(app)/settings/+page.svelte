<script lang="ts">
	import RoleSection from '$lib/settings/components/RoleSection.svelte';
	import AISettingsSection from '$lib/settings/components/AISettingsSection.svelte';
	import ReviewSettingsSection from '$lib/settings/components/ReviewSettingsSection.svelte';
	import SharingSection from '$lib/settings/components/SharingSection.svelte';
	import InstalledContentSection from '$lib/settings/components/InstalledContentSection.svelte';
	import ExportImportSection from '$lib/settings/components/ExportImportSection.svelte';
	import AccountSection from '$lib/settings/components/AccountSection.svelte';
</script>

<svelte:head>
	<title>Settings — StudyApp</title>
</svelte:head>

<div class="flex flex-col gap-8 max-w-2xl">
	<div class="flex flex-col gap-1">
		<h1 class="font-display text-3xl text-[var(--color-text-primary)]">Settings</h1>
		<p class="text-[var(--color-text-secondary)]">Manage your account and preferences.</p>
	</div>

	<RoleSection />
	<AISettingsSection />
	<ReviewSettingsSection />
	<SharingSection />
	<InstalledContentSection />
	<ExportImportSection />

	<!-- Account (with delete) always at the very bottom -->
	<AccountSection />
</div>
