import { relations } from "drizzle-orm";
import { items } from "./items.table";
import { itemImages } from "./item-images.table";

export const itemsRelations = relations(items, ({ many }) => ({
	images: many(itemImages),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
	item: one(items, { fields: [itemImages.itemId], references: [items.id] }),
}));
