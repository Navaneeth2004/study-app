export type AuthStep = 'credentials' | 'otp';

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface SignupCredentials {
	name: string;
	email: string;
	password: string;
	passwordConfirm: string;
}

export interface ValidationErrors {
	name?: string;
	email?: string;
	password?: string;
	passwordConfirm?: string;
	otp?: string;
}

export interface OtpRequest {
	otpId: string;
	email: string;
}