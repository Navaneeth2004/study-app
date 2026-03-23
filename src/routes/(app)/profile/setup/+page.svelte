<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getMyProfile, updateProfile } from '$lib/profile/profileService';
	import { getCurrentUser } from '$lib/auth/authService';

	const user = getCurrentUser();
	let name = $state(user?.name || '');
	let bio = $state('');
	let isProfilePublic = $state(false);
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state('');
	let saving = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			const profile = await getMyProfile();
			if (profile.profileSetupDone) { goto('/viewer'); return; }
			name = profile.name || name;
		} catch { /* use defaults */ }
	});

	function handleAvatar(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		avatarFile = file;
		avatarPreview = URL.createObjectURL(file);
	}

	async function handleSubmit() {
		saving = true; error = '';
		try {
			await updateProfile({
				name: name.trim() || undefined,
				bio: bio.trim(),
				isProfilePublic,
				profileSetupDone: true,
				avatarFile: avatarFile ?? undefined
			});
			goto('/viewer');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save profile.';
		} finally { saving = false; }
	}

	async function handleSkip() {
		saving = true;
		try {
			await updateProfile({ profileSetupDone: true });
		} catch { /* silent */ } finally {
			goto('/viewer');
		}
	}
</script>

<svelte:head><title>Set up your profile — StudyApp</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--color-surface-950)] p-4">
	<div class="w-full max-w-md flex flex-col gap-6 rounded-2xl border border-[var(--color-surface-700)]
	            bg-[var(--color-surface-900)] p-8">
		<div class="flex flex-col gap-1">
			<h1 class="font-display text-2xl text-[var(--color-text-primary)]">Set up your profile</h1>
			<p class="text-sm text-[var(--color-text-secondary)]">You can always change this later in your profile settings.</p>
		</div>

		<!-- Avatar -->
		<div class="flex flex-col items-center gap-3">
			<label class="relative cursor-pointer group" aria-label="Upload avatar">
				{#if avatarPreview}
					<img src={avatarPreview} alt="Avatar preview"
					     class="h-20 w-20 rounded-full object-cover border-2 border-[var(--color-accent-500)]" />
				{:else}
					<div class="flex h-20 w-20 items-center justify-center rounded-full
					            bg-[var(--color-surface-700)] text-2xl font-bold text-[var(--color-text-muted)]
					            border-2 border-dashed border-[var(--color-surface-600)]
					            group-hover:border-[var(--color-accent-500)] transition-colors">
						{name ? name[0].toUpperCase() : '?'}
					</div>
				{/if}
				<div class="absolute inset-0 flex items-center justify-center rounded-full
				            bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round">
						<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
						<circle cx="12" cy="13" r="4"/>
					</svg>
				</div>
				<input type="file" accept="image/*" onchange={handleAvatar} class="hidden" />
			</label>
			<p class="text-xs text-[var(--color-text-muted)]">Click to add a photo</p>
		</div>

		<!-- Name -->
		<div class="flex flex-col gap-1.5">
			<label for="setup-name" class="text-sm font-medium text-[var(--color-text-secondary)]">Display name</label>
			<input id="setup-name" type="text" bind:value={name} placeholder="Your name"
				class="w-full rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-4 py-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors" />
		</div>

		<!-- Bio -->
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center justify-between">
				<label for="setup-bio" class="text-sm font-medium text-[var(--color-text-secondary)]">Bio <span class="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
				<span class="text-xs text-[var(--color-text-muted)]">{bio.length}/200</span>
			</div>
			<textarea id="setup-bio" bind:value={bio} maxlength={200} rows={3} placeholder="Tell others about yourself…"
				class="w-full resize-none rounded-xl border border-[var(--color-surface-600)] bg-[var(--color-surface-800)]
				       px-4 py-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
				       focus:border-[var(--color-accent-500)] focus:outline-none transition-colors"></textarea>
		</div>

		<!-- Visibility toggle -->
		<label class="flex items-start gap-3 cursor-pointer">
			<div class="relative mt-0.5 shrink-0">
				<input type="checkbox" bind:checked={isProfilePublic} class="sr-only peer" />
				<div class="h-5 w-9 rounded-full border border-[var(--color-surface-600)] bg-[var(--color-surface-700)]
				            peer-checked:bg-[var(--color-accent-500)] peer-checked:border-[var(--color-accent-500)]
				            transition-colors"></div>
				<div class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--color-text-muted)] transition-transform
				            peer-checked:translate-x-4 peer-checked:bg-white"></div>
			</div>
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Make my profile public</span>
				<span class="text-xs text-[var(--color-text-muted)]">Public profiles can be found by other users in search.</span>
			</div>
		</label>

		{#if error}<p class="text-sm text-[var(--color-error-400)]">{error}</p>{/if}

		<div class="flex flex-col gap-2">
			<button onclick={handleSubmit} disabled={saving}
				class="w-full rounded-xl bg-[var(--color-accent-500)] px-4 py-3 font-medium text-white
				       hover:bg-[var(--color-accent-400)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
				{saving ? 'Saving…' : 'Get Started'}
			</button>
			<button onclick={handleSkip} disabled={saving}
				class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
				Skip for now
			</button>
		</div>
	</div>
</div>
