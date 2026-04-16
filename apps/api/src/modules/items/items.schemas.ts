import { z } from "zod";
import { ITEM_CATEGORIES, VALIDATION_RULES } from "@workspace/shared/constants";

export const createItemSchema = z.object({
	title: z
		.string()
		.min(VALIDATION_RULES.MIN_TITLE_LENGTH)
		.max(VALIDATION_RULES.MAX_TITLE_LENGTH),
	description: z.string().max(VALIDATION_RULES.MAX_DESCRIPTION_LENGTH).optional(),
	category: z.enum(ITEM_CATEGORIES).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const publishItemSchema = z.object({
	category: z.enum(ITEM_CATEGORIES),
});

export const listItemsQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
	category: z.enum(ITEM_CATEGORIES).optional(),
});

export const confirmImageSchema = z.object({
	storageKey: z.string().min(1),
	mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
	sizeBytes: z.number().int().positive().max(VALIDATION_RULES.MAX_IMAGE_SIZE_BYTES),
	source: z.enum(["gallery", "cover"]),
	cropMetadata: z
		.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
		.optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type PublishItemInput = z.infer<typeof publishItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type ConfirmImageInput = z.infer<typeof confirmImageSchema>;
