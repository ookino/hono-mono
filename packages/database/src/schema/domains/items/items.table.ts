import { boolean, index, pgEnum, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { ITEM_STATUSES, ITEM_CATEGORIES } from "@workspace/shared/constants";
import { generateUuid, generateNanoId } from "../../utils";
import { timestampFields } from "../../shared";

export const itemStatusEnum = pgEnum("item_status", ITEM_STATUSES);
export const itemCategoryEnum = pgEnum("item_category", ITEM_CATEGORIES);

export const items = pgTable(
	"items",
	{
		id: text("id").$defaultFn(() => generateUuid()).primaryKey(),
		publicId: text("public_id").$defaultFn(() => generateNanoId(10)).unique().notNull(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description"),
		status: itemStatusEnum("status").default("draft").notNull(),
		category: itemCategoryEnum("category"),
		ownerId: text("owner_id").notNull(),
		isPublished: boolean("is_published").default(false).notNull(),
		coverImageKey: text("cover_image_key"),
		viewCount: integer("view_count").default(0).notNull(),
		adminNotes: text("admin_notes"),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		...timestampFields(),
	},
	(table) => [
		index("items_slug_idx").on(table.slug),
		index("items_status_created_at_idx").on(table.status, table.createdAt),
		index("items_owner_id_idx").on(table.ownerId),
	],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
