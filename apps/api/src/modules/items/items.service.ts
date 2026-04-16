import {
	DEFAULT_TITLES,
	TERMINAL_STATUSES,
	VALIDATION_RULES,
} from "@workspace/shared/constants";
import type { ItemRepository } from "./items.repository";
import type { ItemMapper, OwnerItemResponse, PublicItemResponse } from "./items.mapper";
import type {
	CreateItemInput,
	UpdateItemInput,
	PublishItemInput,
	ListItemsQuery,
	ConfirmImageInput,
} from "./items.schemas";
import { ItemInvalidStatus } from "./items.exceptions";
import { DomainError } from "../../shared/errors/exceptions";

function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
	let slug = slugify(base);
	if (!(await exists(slug))) return slug;
	let suffix = 2;
	while (await exists(`${slug}-${suffix}`)) suffix++;
	return `${slug}-${suffix}`;
}

export class ItemService {
	constructor(
		private readonly repo: ItemRepository,
		private readonly mapper: ItemMapper,
	) {}

	async create(ownerId: string, input: CreateItemInput): Promise<OwnerItemResponse> {
		const slug = await uniqueSlug(input.title, (s) => this.repo.slugExists(s));
		const item = await this.repo.create({
			title: input.title,
			description: input.description ?? null,
			category: input.category ?? null,
			slug,
			ownerId,
			status: "draft",
		});
		return this.mapper.toOwner(item);
	}

	async getOwner(id: string, ownerId: string): Promise<OwnerItemResponse> {
		const item = await this.repo.findByIdAndOwner(id, ownerId);
		return this.mapper.toOwner(item);
	}

	async getPublicBySlug(slug: string): Promise<PublicItemResponse | null> {
		const item = await this.repo.findBySlug(slug);
		if (!item || item.status !== "active") return null;
		return this.mapper.toPublic(item);
	}

	async listPublished(query: ListItemsQuery): Promise<{
		items: PublicItemResponse[];
		nextCursor: string | null;
	}> {
		const result = await this.repo.findPublished({
			limit: query.limit,
			cursor: query.cursor,
			category: query.category,
		});
		return {
			items: result.items.map((i) => this.mapper.toPublic(i)),
			nextCursor: result.nextCursor,
		};
	}

	async update(id: string, ownerId: string, input: UpdateItemInput): Promise<OwnerItemResponse> {
		const existing = await this.repo.findByIdAndOwner(id, ownerId);

		if (TERMINAL_STATUSES.has(existing.status as any)) {
			throw new ItemInvalidStatus("update", existing.status);
		}

		let slug = existing.slug;
		if (input.title && input.title !== existing.title) {
			slug = await uniqueSlug(input.title, (s) => this.repo.slugExists(s));
		}

		const updated = await this.repo.update(id, {
			...input,
			slug,
		});
		return this.mapper.toOwner(updated);
	}

	async publish(id: string, ownerId: string, input: PublishItemInput): Promise<OwnerItemResponse> {
		const existing = await this.repo.findByIdAndOwner(id, ownerId);

		if (existing.status !== "draft") {
			throw new ItemInvalidStatus("publish", existing.status);
		}

		if (existing.title === DEFAULT_TITLES.ITEM) {
			throw new DomainError("ITEM_NO_TITLE", "Please set a title before publishing.");
		}

		const updated = await this.repo.update(id, {
			status: "active",
			category: input.category,
			isPublished: true,
			publishedAt: new Date(),
		});
		return this.mapper.toOwner(updated);
	}

	async archive(id: string, ownerId: string): Promise<OwnerItemResponse> {
		const existing = await this.repo.findByIdAndOwner(id, ownerId);

		if (TERMINAL_STATUSES.has(existing.status as any)) {
			throw new ItemInvalidStatus("archive", existing.status);
		}

		const updated = await this.repo.update(id, { status: "archived" });
		return this.mapper.toOwner(updated);
	}

	async delete(id: string, ownerId: string): Promise<void> {
		const existing = await this.repo.findByIdAndOwner(id, ownerId);

		if (existing.status === "active") {
			throw new DomainError("ITEM_CANNOT_DELETE_ACTIVE", "Archive the item before deleting it.");
		}

		await this.repo.delete(id);
	}

	async confirmImage(
		id: string,
		ownerId: string,
		input: ConfirmImageInput,
	): Promise<OwnerItemResponse> {
		const existing = await this.repo.findByIdAndOwner(id, ownerId);
		const imageCount = await this.repo.countImages(id);

		if (imageCount >= VALIDATION_RULES.MAX_IMAGES) {
			throw new DomainError(
				"ITEM_IMAGE_LIMIT",
				`Maximum of ${VALIDATION_RULES.MAX_IMAGES} images allowed.`,
			);
		}

		const image = await this.repo.addImage({
			itemId: id,
			storageKey: input.storageKey,
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
			source: input.source,
			isCover: input.source === "cover",
			sortOrder: imageCount,
			cropMetadata: input.cropMetadata ?? null,
		});

		if (input.source === "cover") {
			await this.repo.setCoverImage(id, image.id);
		}

		return this.getOwner(id, ownerId);
	}
}
