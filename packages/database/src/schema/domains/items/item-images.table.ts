import { index, integer, json, pgEnum, pgTable, text, boolean } from "drizzle-orm/pg-core";
import { generateUuid } from "../../utils";
import { timestampFields } from "../../shared";
import { items } from "./items.table";

export const imageSourceEnum = pgEnum("image_source", ["gallery", "cover"]);

export const itemImages = pgTable(
	"item_images",
	{
		id: text("id").$defaultFn(() => generateUuid()).primaryKey(),
		itemId: text("item_id")
			.notNull()
			.references(() => items.id, { onDelete: "cascade" }),
		storageKey: text("storage_key").notNull(),
		mimeType: text("mime_type").notNull(),
		sizeBytes: integer("size_bytes").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		isCover: boolean("is_cover").default(false).notNull(),
		source: imageSourceEnum("source").default("gallery").notNull(),
		cropMetadata: json("crop_metadata").$type<{
			x: number;
			y: number;
			width: number;
			height: number;
		}>(),
		...timestampFields(),
	},
	(table) => [
		index("item_images_item_id_idx").on(table.itemId),
		index("item_images_is_cover_idx").on(table.itemId, table.isCover),
	],
);

export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;
