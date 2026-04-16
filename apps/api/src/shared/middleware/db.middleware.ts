import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types";
import { createDb } from "@workspace/database/client";
import { getEnv } from "../env";

export const dbMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
	const env = getEnv();
	c.set("db", createDb(env.DATABASE_URL));
	return next();
};
