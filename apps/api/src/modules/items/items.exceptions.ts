import { NotFoundError, DomainError, ConflictError } from "../../shared/errors/exceptions";

export class ItemNotFound extends NotFoundError {
	constructor(id: string) {
		super("Item", id);
	}
}

export class ItemInvalidStatus extends DomainError {
	constructor(action: string, status: string) {
		super(
			"ITEM_INVALID_STATUS",
			`Cannot "${action}" an item that is "${status}".`,
		);
	}
}

export class ItemSlugConflict extends ConflictError {
	constructor(slug: string) {
		super(`An item with slug "${slug}" already exists.`);
	}
}
