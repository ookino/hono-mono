export class AppException extends Error {
	constructor(
		readonly statusCode: number,
		readonly code: string,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class NotFoundError extends AppException {
	constructor(resource: string, id: string) {
		super(404, "NOT_FOUND", `${resource} with id "${id}" not found.`);
	}
}

export class ValidationError extends AppException {
	constructor(issues: unknown) {
		super(422, "VALIDATION_ERROR", "Validation failed.", issues);
	}
}

export class ConflictError extends AppException {
	constructor(message: string) {
		super(409, "CONFLICT", message);
	}
}

export class UnauthorizedError extends AppException {
	constructor(message = "Authentication required.") {
		super(401, "UNAUTHORIZED", message);
	}
}

export class ForbiddenError extends AppException {
	constructor(message = "You do not have permission to perform this action.") {
		super(403, "FORBIDDEN", message);
	}
}

export class DomainError extends AppException {
	constructor(code: string, message: string) {
		super(400, code, message);
	}
}
