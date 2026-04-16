import { eq, and, desc, lt, count } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@workspace/database/client";
import { items, itemImages } from "@workspace/database/schema";
import type { NewItem, Item, ItemImage } from "@workspace/database/schema";
import type { ItemWithRelations } from "./items.mapper";
import { ItemNotFound } from "./items.exceptions";

const WITH_RELATIONS = {
	images: true,
} as const;

export class ItemRepository {
	constructor(private readonly db: DatabaseOrTransaction) {}

	async findById(id: string): Promise<ItemWithRelations> {
		const result = await this.db.query.items.findFirst({
			where: eq(items.id, id),
			with: WITH_RELATIONS,
		});
		if (!result) throw new ItemNotFound(id);
		return result;
	}

	async findBySlug(slug: string): Promise<ItemWithRelations | null> {
		return (
			(await this.db.query.items.findFirst({
				where: eq(items.slug, slug),
				with: WITH_RELATIONS,
			})) ?? null
		);
	}

	async findByIdAndOwner(id: string, ownerId: string): Promise<ItemWithRelations> {
		const result = await this.db.query.items.findFirst({
			where: and(eq(items.id, id), eq(items.ownerId, ownerId)),
			with: WITH_RELATIONS,
		});
		if (!result) throw new ItemNotFound(id);
		return result;
	}

	async findPublished(opts: { limit: number; cursor?: string; category?: string }): Promise<{
		items: ItemWithRelations[];
		nextCursor: string | null;
	}> {
		const where = and(
			eq(items.status, "active"),
			opts.cursor ? lt(items.createdAt, new Date(opts.cursor)) : undefined,
			opts.category ? eq(items.category, opts.category as any) : undefined,
		);

		const rows = await this.db.query.items.findMany({
			where,
			orderBy: [desc(items.createdAt)],
			limit: opts.limit + 1,
			with: WITH_RELATIONS,
		});

		const hasMore = rows.length > opts.limit;
		const page = hasMore ? rows.slice(0, opts.limit) : rows;
		const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
		return { items: page, nextCursor };
	}

	async create(data: NewItem): Promise<ItemWithRelations> {
		const [inserted] = await this.db.insert(items).values(data).returning();
		return this.findById(inserted!.id);
	}

	async update(id: string, data: Partial<NewItem>): Promise<ItemWithRelations> {
		await this.db.update(items).set(data).where(eq(items.id, id));
		return this.findById(id);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(items).where(eq(items.id, id));
	}

	async countImages(itemId: string): Promise<number> {
		const [result] = await this.db
			.select({ count: count() })
			.from(itemImages)
			.where(eq(itemImages.itemId, itemId));
		return result?.count ?? 0;
	}

	async addImage(data: Omit<typeof itemImages.$inferInsert, "id">): Promise<ItemImage> {
		const [inserted] = await this.db.insert(itemImages).values(data).returning();
		return inserted!;
	}

	async setCoverImage(itemId: string, imageId: string): Promise<void> {
		await this.db
			.update(itemImages)
			.set({ isCover: false })
			.where(eq(itemImages.itemId, itemId));
		await this.db
			.update(itemImages)
			.set({ isCover: true })
			.where(and(eq(itemImages.id, imageId), eq(itemImages.itemId, itemId)));
	}

	async deleteImage(imageId: string, itemId: string): Promise<void> {
		await this.db
			.delete(itemImages)
			.where(and(eq(itemImages.id, imageId), eq(itemImages.itemId, itemId)));
	}

	async slugExists(slug: string): Promise<boolean> {
		const result = await this.db.query.items.findFirst({
			where: eq(items.slug, slug),
			columns: { id: true },
		});
		return !!result;
	}
}
