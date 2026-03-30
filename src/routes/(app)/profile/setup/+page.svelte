<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getMyProfile, updateProfile } from '$lib/profile/profileService';
	import { getCurrentUser } from '$lib/auth/authService';
	import { pb } from '$lib/shared/pocketbase';

	const user = getCurrentUser();
	let name = $state(user?.name || '');
	let bio = $state('');
	let isProfilePublic = $state(false);
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state('');
	let saving = $state(false);
	let error = $state('');
	let nameError = $state('');
	let checkingName = $state(false);
	let nameChecked = $state(false); // track if async check passed

	onMount(async () => {
		try {
			const profile = await getMyProfile();
			if (profile.profileSetupDone) { goto('/viewer'); return; }
			name = profile.name || name;
		} catch { /* use defaults */ }
	});

	// Debounced uniqueness check
	let nameTimer: ReturnType<typeof setTimeout>;
	function onNameInput() {
		nameError = '';
		nameChecked = false;
		clearTimeout(nameTimer);
		if (!name.trim() || name.trim().length < 2) return;
		nameTimer = setTimeout(checkNameUnique, 500);
	}

	async function checkNameUnique(): Promise<boolean> {
		const trimmed = name.trim();
		if (!trimmed || trimmed.length < 2) {
			nameError = 'Name must be at least 2 characters.';
			return false;
		}
		checkingName = true;
		try {
			const records = await pb.collection('users').getFullList({
				requestKey: null,
				filter: `name = "${trimmed.replace(/"/g, '\\"')}" && id != "${user?.id ?? ''}"`,
				fields: 'id'
			});
			if (records.length > 0) {
				nameError = 'This name is already taken. Please choose another.';
				nameChecked = false;
				return false;
			}
			nameChecked = true;
			return true;
		} catch { nameChecked = true; return true; }
		finally { checkingName = false; }
	}

	function handleAvatar(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		avatarFile = file; avatarPreview = URL.createObjectURL(file);
	}

	async function handleSubmit() {
		nameError = '';
		const trimmed = name.trim();
		if (!trimmed || trimmed.length < 2) { nameError = 'Name must be at least 2 characters.'; return; }
		// Always re-check uniqueness on submit
		const isUnique = await checkNameUnique();
		if (!isUnique) return;

		saving = true; error = '';
		try {
			await updateProfile({ name: trimmed, bio: bio.trim(), isProfilePublic, profileSetupDone: true, avatarFile: avatarFile ?? undefined });
			goto('/viewer');
		} catch (e) { error = e instanceof Error ? e.message : 'Could not save profile.'; }
		finally { saving = false; }
	}

	async function handleSkip() {
		// Generate a unique name based on the user's email prefix + random suffix
		saving = true;
		try {
			const emailPrefix = ((user?.email as string) ?? 'user').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
			const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
			const autoName = `${emailPrefix}${randomSuffix}`;
			await updateProfile({ name: autoName, profileSetupDone: true });
		} catch { /* silent */ }
		finally { goto('/viewer'); }
	}
</script>

<svelte:head><title>Set up your profile — StudyApp</title></svelte:head>

<!--
  This page lives inside (app)/+layout.svelte which renders the sidebar+topbar (pt-16 lg:pl-64).
  We use a full-bleed overlay to cover them and fill the screen ourselves.
-->
<div class="fixed inset-0 z-20 flex items-center justify-center bg-[var(--color-surface-950)] px-4 overflow-y-auto">
	<div class="w-full max-w-md flex flex-col gap-5 rounded-2xl border border-[var(--color-surface-700)] bg-[var(--color-surface-900)] p-8 my-auto">
		<div class="flex flex-col gap-0.5">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Set up your profile</h1>
			<p class="text-sm text-[var(--color-text-secondary)]">You can change this any time in settings.</p>
		</div>

		<!-- Avatar + name row -->
		<div class="flex items-start gap-4">
			<label class="relative cursor-pointer group shrink-0 mt-5" aria-label="Upload avatar">
				{#if avatarPreview}
					<img src={avatarPreview} alt="Avatar" class="h-14 w-14 rounded-full object-cover border-2 border-[var(--color-accent-500)]" />
				{:else}
					<div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-surface-600)] bg-[var(--color-surface-700)] text-lg font-bold text-[var(--color-text-muted)] group-hover:border-[var(--color-accent-500)] transition-colors">
						{name ? name[0].toUpperCase() : '?'}
					</div>
				{/if}
				<div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
				</div>
				<input type="file" accept="image/*" onchange={handleAvatar} class="hidden" />
			</label>

			<div class="flex-1 flex flex-col gap-1">
				<label for="setup-name" class="text-xs font-medium text-[var(--color-text-secondary)]">
					Display name <span class="text-[var(--color-error-400)]">*</span>
				</label>
				<div class="relative">
					<input id="setup-name" type="text" bind:value={name} oninput={onNameInput} placeholder="Choose a unique name"
						class="w-full rounded-xl border px-3 py-2.5 text-sm bg-[var(--color-surface-800)]
						       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
						       focus:outline-none transition-colors pr-8
						       {nameError ? 'border-[var(--color-error-500)]' : nameChecked ? 'border-[var(--color-success-500)]' : 'border-[var(--color-surface-600)] focus:border-[var(--color-accent-500)]'}" />
					{#if checkingName}
						<svg class="animate-spin absolute right-2.5 top-3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--color-text-muted)"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
					{:else if nameChecked && !nameError}
						<svg class="absolute right-2.5 top-3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="color:var(--color-success-500)"><polyline points="20 6 9 17 4 12"/></svg>
					{/if}
				</div>
				{#if nameError}
					<p class="text-xs text-[var(--color-error-400)]">{nameError}</p>
				{:else if !checkingName && name.trim().length >= 2 && nameChecked}
					<p class="text-xs text-[var(--color-success-500)]">Name available ✓</p>
				{:else}
					<p class="text-xs text-[var(--color-text-muted)]">Must be unique across all users.</p>
				{/if}
			</div>
		</div>

		<!-- Bio -->
		<div class="flex flex-col gap-1">
			<div class="flex items-center justify-between">
				<label for="setup-bio" class="text-xs font-medium text-[var(--color-text-secondary)]">Bio <span class="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
				<span class="text-xs text-[var(--color-text-muted)]">{bio.length}/200</span>
			</div>
			<textarea id="setup-bio" bind:value={bio} maxlength={200} rows={2} placeholder="Tell others about yourself…"
				class="w-full resize-none rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"></textarea>
		</div>

		<!-- Public toggle -->
		<label class="flex items-center gap-3 cursor-pointer">
			<div class="relative shrink-0">
				<input type="checkbox" bind:checked={isProfilePublic} class="sr-only peer" />
				<div class="h-5 w-9 rounded-full border border-[var(--color-surface-600)] bg-[var(--color-surface-700)] peer-checked:bg-[var(--color-accent-500)] peer-checked:border-[var(--color-accent-500)] transition-colors"></div>
				<div class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--color-text-muted)] transition-transform peer-checked:translate-x-4 peer-checked:bg-white"></div>
			</div>
			<div>
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Make profile public</span>
				<p class="text-xs text-[var(--color-text-muted)]">Others can find and follow you.</p>
			</div>
		</label>

		{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

		<div class="flex flex-col gap-2">
			<button onclick={handleSubmit} disabled={saving || checkingName || !!nameError}
				class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-2.5 font-medium text-white hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
				{saving ? 'Saving…' : 'Get Started'}
			</button>
			<button onclick={handleSkip} disabled={saving}
				class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				Skip for now
			</button>
		</div>
	</div>
</div>
