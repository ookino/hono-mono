import type { Item, ItemImage } from "@workspace/database/schema";

export interface PublicItemResponse {
	publicId: string;
	slug: string;
	title: string;
	description: string | null;
	category: string | null;
	coverImageUrl: string | null;
	images: PublicItemImageResponse[];
	publishedAt: string | null;
}

export interface OwnerItemResponse extends PublicItemResponse {
	id: string;
	status: string;
	ownerId: string;
	adminNotes: string | null;
	createdAt: string;
	updatedAt: string | null;
}

export interface PublicItemImageResponse {
	storageKey: string;
	url: string;
	isCover: boolean;
	source: string;
}

export type ItemWithRelations = Item & { images: ItemImage[] };

export function createItemMapper(assetsBaseUrl: string) {
	const base = assetsBaseUrl.replace(/\/$/, "");

	function toImageUrl(storageKey: string): string {
		return `${base}/${storageKey}`;
	}

	function toImageResponse(img: ItemImage): PublicItemImageResponse {
		return {
			storageKey: img.storageKey,
			url: toImageUrl(img.storageKey),
			isCover: img.isCover,
			source: img.source,
		};
	}

	function toPublic(item: ItemWithRelations): PublicItemResponse {
		const cover = item.images.find((i) => i.isCover);
		return {
			publicId: item.publicId,
			slug: item.slug,
			title: item.title,
			description: item.description,
			category: item.category,
			coverImageUrl: cover ? toImageUrl(cover.storageKey) : null,
			images: item.images.map(toImageResponse),
			publishedAt: item.publishedAt?.toISOString() ?? null,
		};
	}

	function toOwner(item: ItemWithRelations): OwnerItemResponse {
		return {
			...toPublic(item),
			id: item.id,
			status: item.status,
			ownerId: item.ownerId,
			adminNotes: item.adminNotes,
			createdAt: item.createdAt.toISOString(),
			updatedAt: item.updatedAt?.toISOString() ?? null,
		};
	}

	return { toPublic, toOwner, toImageUrl };
}

export type ItemMapper = ReturnType<typeof createItemMapper>;
