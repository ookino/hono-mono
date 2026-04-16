import type { Context } from "hono";
import type { AppBindings } from "./types";
import { AppException } from "./errors/exceptions";
import { ok, noContent, err } from "./response";

export async function handle<T>(
	c: Context<AppBindings>,
	fn: () => Promise<T>,
	status: 200 | 201 = 200,
) {
	try {
		const data = await fn();
		return ok(c, data, status);
	} catch (e) {
		return handleError(c, e);
	}
}

export async function handleCreate<T>(c: Context<AppBindings>, fn: () => Promise<T>) {
	return handle(c, fn, 201);
}

export async function handleDelete(c: Context<AppBindings>, fn: () => Promise<void>) {
	try {
		await fn();
		return noContent(c);
	} catch (e) {
		return handleError(c, e);
	}
}

function handleError(c: Context<AppBindings>, e: unknown) {
	if (e instanceof AppException) {
		return err(c, e.message, e.code, e.statusCode as any, e.details);
	}
	throw e;
}
