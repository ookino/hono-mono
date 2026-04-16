import { zValidator } from "@hono/zod-validator";
import { createRouter } from "../../../shared/router";
import { handle, handleCreate, handleDelete } from "../../../shared/handler";
import { requireSession } from "../../../shared/middleware/session.middleware";
import {
	createItemSchema,
	updateItemSchema,
	publishItemSchema,
	confirmImageSchema,
} from "../items.schemas";

const router = createRouter().use(requireSession);

export const itemOwnerRoutes = router
	.post("/", zValidator("json", createItemSchema), (c) =>
		handleCreate(c, () =>
			c.var.container.items.create(c.var.user!.id, c.req.valid("json")),
		),
	)
	.get("/:id/owner", (c) =>
		handle(c, () =>
			c.var.container.items.getOwner(c.req.param("id"), c.var.user!.id),
		),
	)
	.patch("/:id", zValidator("json", updateItemSchema), (c) =>
		handle(c, () =>
			c.var.container.items.update(c.req.param("id"), c.var.user!.id, c.req.valid("json")),
		),
	)
	.post("/:id/publish", zValidator("json", publishItemSchema), (c) =>
		handle(c, () =>
			c.var.container.items.publish(c.req.param("id"), c.var.user!.id, c.req.valid("json")),
		),
	)
	.post("/:id/archive", (c) =>
		handle(c, () =>
			c.var.container.items.archive(c.req.param("id"), c.var.user!.id),
		),
	)
	.post("/:id/images/confirm", zValidator("json", confirmImageSchema), (c) =>
		handle(c, () =>
			c.var.container.items.confirmImage(
				c.req.param("id"),
				c.var.user!.id,
				c.req.valid("json"),
			),
		),
	)
	.delete("/:id", (c) =>
		handleDelete(c, () =>
			c.var.container.items.delete(c.req.param("id"), c.var.user!.id),
		),
	);
