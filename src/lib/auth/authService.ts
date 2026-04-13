import { pb } from '$lib/shared/pocketbase';
import { roleStore } from '$lib/shared/stores/roleStore';
import { ClientResponseError } from 'pocketbase';
import type { OtpRequest } from './authTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const users = () => pb.collection('users') as any;

export async function login(email: string, password: string): Promise<void> {
	try {
		await pb.collection('users').authWithPassword(email, password);
		roleStore.reset();
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error('Invalid email or password.');
		throw e;
	}
}

export async function createUserAndRequestOtp(
	name: string, email: string, password: string, passwordConfirm: string
): Promise<OtpRequest> {
	try {
		await pb.collection('users').create({ name, email, password, passwordConfirm });
	} catch (e) {
		if (e instanceof ClientResponseError) {
			const isEmailTaken = e.status === 400 && JSON.stringify(e.data).toLowerCase().includes('email');
			if (isEmailTaken) throw new Error('An account with this email already exists.');
			throw new Error(e.message);
		}
		throw e;
	}
	try {
		const result = await users().requestOTP(email);
		return { otpId: result.otpId, email };
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error(e.message);
		throw e;
	}
}

export async function verifyOtp(otpId: string, otp: string): Promise<void> {
	try {
		await users().authWithOTP(otpId, otp);
		roleStore.reset();
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error('Invalid or expired code.');
		throw e;
	}
}

export async function unlockCreator(password: string): Promise<void> {
	const user = pb.authStore.record;
	if (!user) throw new Error('Not authenticated.');
	try {
		await pb.collection('users').authWithPassword(user.email, password);
		await pb.collection('users').update(user.id, { isCreator: true });
		roleStore.setCreator();
	} catch (e) {
		if (e instanceof ClientResponseError) throw new Error('Incorrect password.');
		throw e;
	}
}

export function getCurrentUser() {
	return pb.authStore.record;
}

export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

export function logout(): void {
	// Clear PocketBase auth
	pb.authStore.clear();
	roleStore.reset();
	// Clear any session storage that could leak between users
	try { sessionStorage.clear(); } catch { /* ignore */ }
	// Note: localStorage AI keys are intentionally kept (they're per-device not per-user)
}

export async function verifyPassword(password: string): Promise<boolean> {
	const user = pb.authStore.record;
	if (!user) return false;
	try {
		await pb.collection('users').authWithPassword(user.email as string, password);
		return true;
	} catch {
		return false;
	}
}
