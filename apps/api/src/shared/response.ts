import type { Context } from "hono";
import type { AppBindings } from "./types";

export function ok<T>(c: Context<AppBindings>, data: T, status: 200 | 201 = 200) {
	return c.json({ success: true as const, data }, status);
}

export function noContent(c: Context<AppBindings>) {
	return c.body(null, 204);
}

export function err(
	c: Context<AppBindings>,
	message: string,
	code: string,
	status: 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503 = 400,
	details?: unknown,
) {
	return c.json({ success: false as const, error: { code, message, details } }, status);
}
