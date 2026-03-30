export interface Rating {
	id: string;
	user: string;
	contentType: string;
	contentId: string;
	rating: number;
	created: string;
	updated: string;
}

export interface RatingSummary {
	average: number;
	count: number;
	userRating: number | null;
	/** true if the current user is the content owner — they can see but not rate */
	isOwner: boolean;
}

export interface CommentVote {
	id: string;
	user: string;
	comment: string;
	vote: 1 | -1;
}

export interface Comment {
	id: string;
	user: string;
	contentType: string;
	contentId: string;
	parentComment: string | null;
	text: string;
	isDeleted: boolean;
	isPinned: boolean;
	created: string;
	updated: string;
	upvotes: number;
	downvotes: number;
	userVote: 1 | -1 | null;
	expand?: {
		user?: { id: string; name: string; email: string };
	};
	replies?: Comment[];
}
