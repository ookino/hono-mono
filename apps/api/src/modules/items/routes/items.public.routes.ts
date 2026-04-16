import { zValidator } from "@hono/zod-validator";
import { createRouter } from "../../../shared/router";
import { handle } from "../../../shared/handler";
import { listItemsQuerySchema } from "../items.schemas";

export const itemPublicRoutes = createRouter()
	.get("/", zValidator("query", listItemsQuerySchema), (c) =>
		handle(c, () => c.var.container.items.listPublished(c.req.valid("query"))),
	)
	.get("/:slug", (c) =>
		handle(c, async () => {
			const item = await c.var.container.items.getPublicBySlug(c.req.param("slug"));
			if (!item) return c.notFound();
			return item;
		}),
	);
