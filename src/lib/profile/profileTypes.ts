export interface UserProfile {
	id: string;
	name: string;
	email: string;
	avatar: string;
	avatarUrl: string;
	bio: string;
	instagramUrl: string;
	youtubeUrl: string;
	websiteUrl: string;
	isProfilePublic: boolean;
	profileSetupDone: boolean;
	created: string;
	updated: string;
}

export interface PublicProfile {
	id: string;
	name: string;
	avatarUrl: string;
	bio: string;
	instagramUrl: string;
	youtubeUrl: string;
	websiteUrl: string;
	isProfilePublic: boolean;
	isDeleted: boolean;
	created: string;
}

export interface ProfileStats {
	publishedTextbooks: number;
	publishedDecks: number;
	totalInstalls: number;
	mostInstalledContent: Array<{ id: string; title: string; installs: number; type: 'textbook' | 'deck' }>;
	followers: number;
	following: number;
	totalComments: number;
	memberSince: string;
}

export interface Follow {
	id: string;
	follower: string;
	following: string;
	created: string;
}

export interface FollowerUser {
	id: string;
	name: string;
	avatarUrl: string;
	bio: string;
}

export interface UpdateProfileData {
	name?: string;
	bio?: string;
	instagramUrl?: string;
	youtubeUrl?: string;
	websiteUrl?: string;
	isProfilePublic?: boolean;
	profileSetupDone?: boolean;
	avatarFile?: File;
}
