export const ITEM_STATUSES = ["draft", "active", "archived"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_CATEGORIES = ["general", "featured", "premium"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const DEFAULT_TITLES = {
	ITEM: "Untitled item",
} as const;

export const VALIDATION_RULES = {
	MIN_TITLE_LENGTH: 3,
	MAX_TITLE_LENGTH: 120,
	MAX_DESCRIPTION_LENGTH: 2000,
	MAX_IMAGES: 5,
	MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
	UPLOAD_URL_EXPIRY_SECONDS: 300,
} as const;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const TERMINAL_STATUSES = new Set<ItemStatus>(["archived"]);
