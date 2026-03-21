import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

const PROTECTED_PREFIXES = ['/viewer', '/settings', '/creator'];
const AUTH_PREFIX = '/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const pb = new PocketBase(PUBLIC_POCKETBASE_URL);

	const cookie = event.request.headers.get('cookie') ?? '';
	pb.authStore.loadFromCookie(cookie);

	const isAuthenticated = pb.authStore.isValid;
	const path = event.url.pathname;

	const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

	if (!isAuthenticated && isProtected) {
		redirect(303, '/auth/login');
	}

	if (isAuthenticated && path.startsWith(AUTH_PREFIX)) {
		redirect(303, '/viewer');
	}

	const response = await resolve(event);

	response.headers.append(
		'set-cookie',
		pb.authStore.exportToCookie({ httpOnly: true, secure: false })
	);

	return response;
};