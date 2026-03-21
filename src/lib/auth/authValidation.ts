import type { ValidationErrors } from './authTypes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;

export function validateEmail(email: string): string | undefined {
	if (!email.trim()) return 'Email is required.';
	if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address.';
	return undefined;
}

export function validateName(name: string): string | undefined {
	if (!name.trim()) return 'Name is required.';
	if (name.trim().length < 2) return 'Name must be at least 2 characters.';
	return undefined;
}

export function validatePassword(password: string): string | undefined {
	if (!password) return 'Password is required.';
	if (password.length < 8) return 'Password must be at least 8 characters.';
	return undefined;
}

export function validatePasswordConfirm(password: string, passwordConfirm: string): string | undefined {
	if (!passwordConfirm) return 'Please confirm your password.';
	if (password !== passwordConfirm) return 'Passwords do not match.';
	return undefined;
}

export function validateOtp(otp: string): string | undefined {
	if (!otp.trim()) return 'Verification code is required.';
	if (otp.trim().length !== OTP_LENGTH) return `Code must be ${OTP_LENGTH} digits.`;
	if (!/^\d+$/.test(otp.trim())) return 'Code must contain digits only.';
	return undefined;
}

export function validateLoginForm(email: string, password: string): ValidationErrors {
	const errors: ValidationErrors = {};
	const emailError = validateEmail(email);
	const passwordError = validatePassword(password);
	if (emailError) errors.email = emailError;
	if (passwordError) errors.password = passwordError;
	return errors;
}

export function validateSignupForm(
	name: string,
	email: string,
	password: string,
	passwordConfirm: string
): ValidationErrors {
	const errors: ValidationErrors = {};
	const nameError = validateName(name);
	const emailError = validateEmail(email);
	const passwordError = validatePassword(password);
	const passwordConfirmError = validatePasswordConfirm(password, passwordConfirm);
	if (nameError) errors.name = nameError;
	if (emailError) errors.email = emailError;
	if (passwordError) errors.password = passwordError;
	if (passwordConfirmError) errors.passwordConfirm = passwordConfirmError;
	return errors;
}