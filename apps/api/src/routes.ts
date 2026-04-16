import { createRouter } from "./shared/router";
import { itemPublicRoutes } from "./modules/items/routes/items.public.routes";
import { itemOwnerRoutes } from "./modules/items/routes/items.owner.routes";

export const appRoutes = createRouter()
	// Public first — prevents 401 on unauthenticated GETs
	.route("/items", itemPublicRoutes)
	.route("/items", itemOwnerRoutes);
