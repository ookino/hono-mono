import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types";
import { createContainer } from "../../container/index";

export const containerMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
	c.set("container", createContainer(c));
	return next();
};
