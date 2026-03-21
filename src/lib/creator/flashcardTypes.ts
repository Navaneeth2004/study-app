export interface FlashcardSide {
	text: string;
	imageUrl?: string;
	audioUrl?: string;
}

export interface Flashcard {
	id: string;
	owner: string;
	frontText: string;
	frontImageUrl: string;
	frontAudioUrl: string;
	backText: string;
	backImageUrl: string;
	backAudioUrl: string;
	chapter: string;
	category: string;
	order: number;
	created: string;
	updated: string;
}

export interface FlashcardCategory {
	id: string;
	name: string;
	description: string;
	owner: string;
	ownerName?: string;
	created: string;
	updated: string;
	cardCount?: number;
}

export interface FlashcardForm {
	frontText: string;
	backText: string;
	frontImageFile?: File;
	backImageFile?: File;
	frontAudioFile?: File;
	backAudioFile?: File;
	frontImageUrl?: string;
	backImageUrl?: string;
	frontAudioUrl?: string;
	backAudioUrl?: string;
	chapter?: string;
	category?: string;
	order?: number;
}
