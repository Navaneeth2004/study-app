export type Role = 'viewer' | 'creator';

export interface RoleState {
	role: Role;
	isCreator: boolean;
}