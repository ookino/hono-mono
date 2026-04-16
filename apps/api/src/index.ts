import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./shared/types";
import { dbMiddleware } from "./shared/middleware/db.middleware";
import { sessionMiddleware } from "./shared/middleware/session.middleware";
import { containerMiddleware } from "./shared/middleware/container.middleware";
import { globalErrorHandler } from "./shared/errors/handler";
import { appRoutes } from "./routes";

const app = new Hono<AppBindings>();

app.use("*", cors({ origin: process.env.WEB_APP_URL ?? "*", credentials: true }));
app.use("*", dbMiddleware);
app.use("*", sessionMiddleware);
app.use("*", containerMiddleware);
app.route("/", appRoutes);
app.onError(globalErrorHandler);

export type AppType = typeof appRoutes;

Bun.serve({ fetch: app.fetch, port: 3001 });

export default app;
