# Monorepo API Starter Template — Build Spec

This document is a complete specification for an agent to scaffold a monorepo starter template following the architecture patterns described below. The output is a clean, minimal, working project — not a copy of any existing codebase. Use one demo domain (`items`) to illustrate all patterns.

---

## Goals

- Bun monorepo with two packages: `apps/api` and `packages/api-client`
- A shared `packages/database` (Drizzle + Postgres) and `packages/shared` (constants)
- A single example domain (`items`) wired end-to-end following the full module pattern
- All patterns implemented correctly so future domains can be added by copying the folder structure

---

## Monorepo Root

### `package.json`

```json
{
  "name": "starter",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "check": "biome check --write .",
    "format": "biome format --write ."
  }
}
```

### `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "indentStyle": "tab" },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  }
}
```

### `tsconfig.json` (root, extended by packages)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react-jsx"
  }
}
```

---

## Package: `packages/shared`

Constants shared across all packages. No runtime dependencies.

### `packages/shared/package.json`

```json
{
  "name": "@workspace/shared",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./constants": "./src/constants/index.ts"
  }
}
```

### `packages/shared/src/constants/items.ts`

```ts
export const ITEM_STATUSES = ["draft", "active", "archived"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_CATEGORIES = ["general", "featured", "premium"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const DEFAULT_TITLES = {
  ITEM: "Untitled item",
} as const;

export const VALIDATION_RULES = {
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 120,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_IMAGES: 5,
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
  UPLOAD_URL_EXPIRY_SECONDS: 300,
} as const;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const TERMINAL_STATUSES = new Set<ItemStatus>(["archived"]);
```

### `packages/shared/src/constants/index.ts`

Re-export all constant files.

### `packages/shared/src/index.ts`

Re-export from `./constants/index.ts`.

---

## Package: `packages/database`

Drizzle ORM schema and client. Targets PostgreSQL.

### `packages/database/package.json`

```json
{
  "name": "@workspace/database",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0"
  }
}
```

### `packages/database/drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/migrations",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### `packages/database/src/client.ts`

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export function createDb(connectionString: string) {
  // `prepare: false` is required when using connection poolers (e.g. pgBouncer, Hyperdrive)
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseOrTransaction = Database | Transaction;
```

### `packages/database/src/schema/utils.ts`

```ts
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";

export const generateUuid = () => randomUUID();

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
export const generateNanoId = (size = 10) => nanoid(size);
```

> **Dependency note:** add `nanoid` to `packages/database` dependencies.

### `packages/database/src/schema/shared.ts`

```ts
import { integer, text, timestamp } from "drizzle-orm/pg-core";

export const timestampFields = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});
```

### `packages/database/src/schema/domains/items/items.table.ts`

```ts
import { boolean, index, pgEnum, pgTable, text, integer } from "drizzle-orm/pg-core";
import { ITEM_STATUSES, ITEM_CATEGORIES } from "@workspace/shared/constants";
import { generateUuid, generateNanoId } from "../../utils.ts";
import { timestampFields } from "../../shared.ts";

export const itemStatusEnum = pgEnum("item_status", ITEM_STATUSES);
export const itemCategoryEnum = pgEnum("item_category", ITEM_CATEGORIES);

export const items = pgTable(
  "items",
  {
    id: text("id").$defaultFn(() => generateUuid()).primaryKey(),
    publicId: text("public_id").$defaultFn(() => generateNanoId(10)).unique().notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    status: itemStatusEnum("status").default("draft").notNull(),
    category: itemCategoryEnum("category"),
    ownerId: text("owner_id").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    coverImageKey: text("cover_image_key"),
    viewCount: integer("view_count").default(0).notNull(),
    adminNotes: text("admin_notes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestampFields(),
  },
  (table) => [
    index("items_slug_idx").on(table.slug),
    index("items_status_created_at_idx").on(table.status, table.createdAt),
    index("items_owner_id_idx").on(table.ownerId),
  ],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

### `packages/database/src/schema/domains/items/item-images.table.ts`

```ts
import { index, integer, json, pgEnum, pgTable, text, boolean } from "drizzle-orm/pg-core";
import { IMAGE_MIME_TYPES } from "@workspace/shared/constants";
import { generateUuid } from "../../utils.ts";
import { timestampFields } from "../../shared.ts";
import { items } from "./items.table.ts";

export const imageSourceEnum = pgEnum("image_source", ["gallery", "cover"]);

export const itemImages = pgTable(
  "item_images",
  {
    id: text("id").$defaultFn(() => generateUuid()).primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isCover: boolean("is_cover").default(false).notNull(),
    source: imageSourceEnum("source").default("gallery").notNull(),
    cropMetadata: json("crop_metadata").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(),
    ...timestampFields(),
  },
  (table) => [
    index("item_images_item_id_idx").on(table.itemId),
    index("item_images_is_cover_idx").on(table.itemId, table.isCover),
  ],
);

export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;
```

### `packages/database/src/schema/domains/items/item-relations.ts`

```ts
import { relations } from "drizzle-orm";
import { items } from "./items.table.ts";
import { itemImages } from "./item-images.table.ts";

export const itemsRelations = relations(items, ({ many }) => ({
  images: many(itemImages),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, { fields: [itemImages.itemId], references: [items.id] }),
}));
```

### `packages/database/src/schema/index.ts`

Export all tables and relations.

### `packages/database/src/index.ts`

Re-export `createDb`, types, and schema.

---

## Package: `packages/api-client`

Hono RPC typed client. Depends on the API app for its `AppType`.

### `packages/api-client/package.json`

```json
{
  "name": "@workspace/api-client",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "hono": "^4.0.0"
  }
}
```

### `packages/api-client/src/index.ts`

```ts
import { hc } from "hono/client";
import type { AppType } from "../../apps/api/src/index.ts";

export const apiClient = (baseURL: string) =>
  hc<AppType>(baseURL, {
    init: { credentials: "include" },
  });

export type ApiClient = ReturnType<typeof apiClient>;
```

> `AppType` is the exported type from `apps/api/src/index.ts`. The API must `export type { AppType }`.

---

## App: `apps/api`

Hono API running on Bun (Node.js-compatible, not Cloudflare Workers). For a Cloudflare Workers target, swap `Bun.serve` for `export default app` and add a `wrangler.jsonc`.

### `apps/api/package.json`

```json
{
  "name": "@workspace/api",
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/index.ts",
    "start": "bun src/index.ts"
  },
  "dependencies": {
    "@hono/zod-validator": "^0.5.0",
    "@workspace/database": "workspace:*",
    "@workspace/shared": "workspace:*",
    "hono": "^4.0.0",
    "zod": "^3.0.0"
  }
}
```

### `apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@workspace/*": ["../../packages/*/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

---

### Entry Point: `apps/api/src/index.ts`

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./shared/types.ts";
import { dbMiddleware } from "./shared/middleware/db.middleware.ts";
import { sessionMiddleware } from "./shared/middleware/session.middleware.ts";
import { containerMiddleware } from "./shared/middleware/container.middleware.ts";
import { globalErrorHandler } from "./shared/errors/handler.ts";
import { appRoutes } from "./routes.ts";

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
```

---

### Types: `apps/api/src/shared/types.ts`

Centralises all Hono context variables.

```ts
import type { Database } from "@workspace/database/client";
import type { RoutesContainer } from "../container/index.ts";

export interface AppEnv {
  DATABASE_URL: string;
  WEB_APP_URL: string;
  ASSETS_BASE_URL: string;
  JWT_SECRET: string;
  // extend as needed
}

export interface AppVariables {
  db: Database;
  user: AuthUser | null;
  container: RoutesContainer;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export type AppBindings = {
  Bindings: AppEnv;
  Variables: AppVariables;
};
```

---

### Env: `apps/api/src/shared/env.ts`

Parse and validate environment variables once at startup.

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  WEB_APP_URL: z.string().url(),
  ASSETS_BASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export type AppEnvParsed = z.infer<typeof envSchema>;

let _env: AppEnvParsed;

export function getEnv(): AppEnvParsed {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
```

---

### Router Factory: `apps/api/src/shared/router.ts`

```ts
import { Hono } from "hono";
import type { AppBindings } from "./types.ts";

export function createRouter() {
  return new Hono<AppBindings>({ strict: false });
}
```

---

### Response Helpers: `apps/api/src/shared/response.ts`

```ts
import type { Context } from "hono";
import type { AppBindings } from "./types.ts";

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
```

---

### Handler Wrappers: `apps/api/src/shared/handler.ts`

Wrap service calls so routes stay lean. Catches `AppException` and converts to structured error responses.

```ts
import type { Context } from "hono";
import type { AppBindings } from "./types.ts";
import { AppException } from "./errors/exceptions.ts";
import { ok, noContent, err } from "./response.ts";

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
  throw e; // re-throw — caught by global error handler
}
```

---

### Errors: `apps/api/src/shared/errors/exceptions.ts`

```ts
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
```

### Errors: `apps/api/src/shared/errors/handler.ts`

```ts
import type { ErrorHandler } from "hono";
import type { AppBindings } from "../types.ts";
import { AppException } from "./exceptions.ts";

export const globalErrorHandler: ErrorHandler<AppBindings> = (err, c) => {
  if (err instanceof AppException) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message, details: err.details } },
      err.statusCode as any,
    );
  }

  console.error("[Unhandled Error]", err);

  return c.json(
    { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
    500,
  );
};
```

---

### Middleware: `apps/api/src/shared/middleware/db.middleware.ts`

```ts
import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types.ts";
import { createDb } from "@workspace/database/client";
import { getEnv } from "../env.ts";

export const dbMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const env = getEnv();
  c.set("db", createDb(env.DATABASE_URL));
  return next();
};
```

### Middleware: `apps/api/src/shared/middleware/session.middleware.ts`

Stub implementation — replace with your real auth provider (JWT, Better Auth, etc.).

```ts
import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types.ts";
import { UnauthorizedError } from "../errors/exceptions.ts";

/**
 * Reads the Authorization header and sets c.var.user.
 * Replace the JWT decode stub with your actual auth logic.
 */
export const sessionMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // TODO: verify JWT and extract user
    // const user = await verifyJwt(token, getEnv().JWT_SECRET);
    // c.set("user", user);
    c.set("user", null);
  } else {
    c.set("user", null);
  }
  return next();
};

/**
 * Require an authenticated session. Use after sessionMiddleware.
 */
export const requireSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (!c.var.user) throw new UnauthorizedError();
  return next();
};
```

### Middleware: `apps/api/src/shared/middleware/container.middleware.ts`

```ts
import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types.ts";
import { createContainer } from "../../container/index.ts";

export const containerMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  c.set("container", createContainer(c));
  return next();
};
```

---

### Container: `apps/api/src/container/index.ts`

Single factory that wires all domain services. Exposes `withTransaction` for atomic cross-domain writes.

```ts
import type { Context } from "hono";
import type { AppBindings } from "../shared/types.ts";
import type { DatabaseOrTransaction } from "@workspace/database/client";
import { ItemFactory } from "../modules/items/items.factory.ts";
import { getEnv } from "../shared/env.ts";

function buildServices(db: DatabaseOrTransaction) {
  const env = getEnv();
  return {
    items: ItemFactory.createService(db, env),
  };
}

export function createContainer(c: Context<AppBindings>) {
  const db = c.var.db;
  const services = buildServices(db);

  return {
    ...services,
    withTransaction: <T>(fn: (ctx: ReturnType<typeof buildServices>) => Promise<T>): Promise<T> =>
      db.transaction((tx) => fn(buildServices(tx))),
  };
}

export type RoutesContainer = ReturnType<typeof createContainer>;
```

---

### Routes: `apps/api/src/routes.ts`

```ts
import { createRouter } from "./shared/router.ts";
import { itemPublicRoutes } from "./modules/items/routes/items.public.routes.ts";
import { itemOwnerRoutes } from "./modules/items/routes/items.owner.routes.ts";

export const appRoutes = createRouter()
  // Public first — prevents 401 on unauthenticated GETs
  .route("/items", itemPublicRoutes)
  .route("/items", itemOwnerRoutes);
```

---

## Domain Module: `apps/api/src/modules/items/`

This is the reference module. All future domains follow this exact file structure.

```
items/
  items.exceptions.ts
  items.types.ts
  items.schemas.ts
  items.mapper.ts
  items.repository.ts
  items.service.ts
  items.factory.ts
  routes/
    items.public.routes.ts
    items.owner.routes.ts
```

---

### `items.exceptions.ts`

```ts
import { NotFoundError, DomainError, ConflictError } from "../../shared/errors/exceptions.ts";

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
```

---

### `items.schemas.ts`

```ts
import { z } from "zod";
import { ITEM_CATEGORIES, VALIDATION_RULES } from "@workspace/shared/constants";

export const createItemSchema = z.object({
  title: z
    .string()
    .min(VALIDATION_RULES.MIN_TITLE_LENGTH)
    .max(VALIDATION_RULES.MAX_TITLE_LENGTH),
  description: z.string().max(VALIDATION_RULES.MAX_DESCRIPTION_LENGTH).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const publishItemSchema = z.object({
  category: z.enum(ITEM_CATEGORIES),
});

export const listItemsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(ITEM_CATEGORIES).optional(),
});

export const confirmImageSchema = z.object({
  storageKey: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(VALIDATION_RULES.MAX_IMAGE_SIZE_BYTES),
  source: z.enum(["gallery", "cover"]),
  cropMetadata: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type PublishItemInput = z.infer<typeof publishItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type ConfirmImageInput = z.infer<typeof confirmImageSchema>;
```

---

### `items.mapper.ts`

Factory function that bakes in `assetsBaseUrl` once. Returns pure functions — no class, no `this`.

```ts
import type { Item, ItemImage } from "@workspace/database/schema";

export interface PublicItemResponse {
  publicId: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  coverImageUrl: string | null;
  images: PublicItemImageResponse[];
  publishedAt: string | null;
}

export interface OwnerItemResponse extends PublicItemResponse {
  id: string;
  status: string;
  ownerId: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PublicItemImageResponse {
  storageKey: string;
  url: string;
  isCover: boolean;
  source: string;
}

export type ItemWithRelations = Item & { images: ItemImage[] };

export function createItemMapper(assetsBaseUrl: string) {
  const base = assetsBaseUrl.replace(/\/$/, "");

  function toImageUrl(storageKey: string): string {
    return `${base}/${storageKey}`;
  }

  function toImageResponse(img: ItemImage): PublicItemImageResponse {
    return {
      storageKey: img.storageKey,
      url: toImageUrl(img.storageKey),
      isCover: img.isCover,
      source: img.source,
    };
  }

  function toPublic(item: ItemWithRelations): PublicItemResponse {
    const cover = item.images.find((i) => i.isCover);
    return {
      publicId: item.publicId,
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      coverImageUrl: cover ? toImageUrl(cover.storageKey) : null,
      images: item.images.map(toImageResponse),
      publishedAt: item.publishedAt?.toISOString() ?? null,
    };
  }

  function toOwner(item: ItemWithRelations): OwnerItemResponse {
    return {
      ...toPublic(item),
      id: item.id,
      status: item.status,
      ownerId: item.ownerId,
      adminNotes: item.adminNotes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt?.toISOString() ?? null,
    };
  }

  return { toPublic, toOwner, toImageUrl };
}

export type ItemMapper = ReturnType<typeof createItemMapper>;
```

---

### `items.repository.ts`

All DB queries live here. Throws exceptions on missing records. No business logic.

```ts
import { eq, and, desc, lt, count } from "drizzle-orm";
import type { DatabaseOrTransaction } from "@workspace/database/client";
import { items, itemImages } from "@workspace/database/schema";
import type { NewItem, Item, ItemImage } from "@workspace/database/schema";
import type { ItemWithRelations } from "./items.mapper.ts";
import { ItemNotFound } from "./items.exceptions.ts";

const WITH_RELATIONS = {
  images: true,
} as const;

export class ItemRepository {
  constructor(private readonly db: DatabaseOrTransaction) {}

  async findById(id: string): Promise<ItemWithRelations> {
    const result = await this.db.query.items.findFirst({
      where: eq(items.id, id),
      with: WITH_RELATIONS,
    });
    if (!result) throw new ItemNotFound(id);
    return result;
  }

  async findBySlug(slug: string): Promise<ItemWithRelations | null> {
    return (
      (await this.db.query.items.findFirst({
        where: eq(items.slug, slug),
        with: WITH_RELATIONS,
      })) ?? null
    );
  }

  async findByIdAndOwner(id: string, ownerId: string): Promise<ItemWithRelations> {
    const result = await this.db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.ownerId, ownerId)),
      with: WITH_RELATIONS,
    });
    if (!result) throw new ItemNotFound(id);
    return result;
  }

  async findPublished(opts: { limit: number; cursor?: string; category?: string }): Promise<{
    items: ItemWithRelations[];
    nextCursor: string | null;
  }> {
    const where = and(
      eq(items.status, "active"),
      opts.cursor ? lt(items.createdAt, new Date(opts.cursor)) : undefined,
      opts.category ? eq(items.category, opts.category as any) : undefined,
    );

    const rows = await this.db.query.items.findMany({
      where,
      orderBy: [desc(items.createdAt)],
      limit: opts.limit + 1,
      with: WITH_RELATIONS,
    });

    const hasMore = rows.length > opts.limit;
    const page = hasMore ? rows.slice(0, opts.limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
    return { items: page, nextCursor };
  }

  async create(data: NewItem): Promise<ItemWithRelations> {
    const [inserted] = await this.db.insert(items).values(data).returning();
    return this.findById(inserted!.id);
  }

  async update(id: string, data: Partial<NewItem>): Promise<ItemWithRelations> {
    await this.db.update(items).set(data).where(eq(items.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(items).where(eq(items.id, id));
  }

  async countImages(itemId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(itemImages)
      .where(eq(itemImages.itemId, itemId));
    return result?.count ?? 0;
  }

  async addImage(data: Omit<typeof itemImages.$inferInsert, "id">): Promise<ItemImage> {
    const [inserted] = await this.db.insert(itemImages).values(data).returning();
    return inserted!;
  }

  async setCoverImage(itemId: string, imageId: string): Promise<void> {
    // Demote all existing covers, promote the new one
    await this.db
      .update(itemImages)
      .set({ isCover: false })
      .where(eq(itemImages.itemId, itemId));
    await this.db
      .update(itemImages)
      .set({ isCover: true })
      .where(and(eq(itemImages.id, imageId), eq(itemImages.itemId, itemId)));
  }

  async deleteImage(imageId: string, itemId: string): Promise<void> {
    await this.db
      .delete(itemImages)
      .where(and(eq(itemImages.id, imageId), eq(itemImages.itemId, itemId)));
  }

  async slugExists(slug: string): Promise<boolean> {
    const result = await this.db.query.items.findFirst({
      where: eq(items.slug, slug),
      columns: { id: true },
    });
    return !!result;
  }
}
```

---

### `items.service.ts`

Business logic. Calls repo, applies rules, returns mapped responses.

```ts
import {
  DEFAULT_TITLES,
  TERMINAL_STATUSES,
  VALIDATION_RULES,
} from "@workspace/shared/constants";
import type { ItemRepository } from "./items.repository.ts";
import type { ItemMapper, OwnerItemResponse, PublicItemResponse } from "./items.mapper.ts";
import type {
  CreateItemInput,
  UpdateItemInput,
  PublishItemInput,
  ListItemsQuery,
  ConfirmImageInput,
} from "./items.schemas.ts";
import { ItemInvalidStatus, ItemNotFound } from "./items.exceptions.ts";
import { DomainError } from "../../shared/errors/exceptions.ts";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base);
  if (!(await exists(slug))) return slug;
  let suffix = 2;
  while (await exists(`${slug}-${suffix}`)) suffix++;
  return `${slug}-${suffix}`;
}

export class ItemService {
  constructor(
    private readonly repo: ItemRepository,
    private readonly mapper: ItemMapper,
  ) {}

  async create(ownerId: string, input: CreateItemInput): Promise<OwnerItemResponse> {
    const slug = await uniqueSlug(input.title, (s) => this.repo.slugExists(s));
    const item = await this.repo.create({
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      slug,
      ownerId,
      status: "draft",
    });
    return this.mapper.toOwner(item);
  }

  async getOwner(id: string, ownerId: string): Promise<OwnerItemResponse> {
    const item = await this.repo.findByIdAndOwner(id, ownerId);
    return this.mapper.toOwner(item);
  }

  async getPublicBySlug(slug: string): Promise<PublicItemResponse | null> {
    const item = await this.repo.findBySlug(slug);
    if (!item || item.status !== "active") return null;
    return this.mapper.toPublic(item);
  }

  async listPublished(query: ListItemsQuery): Promise<{
    items: PublicItemResponse[];
    nextCursor: string | null;
  }> {
    const result = await this.repo.findPublished({
      limit: query.limit,
      cursor: query.cursor,
      category: query.category,
    });
    return {
      items: result.items.map((i) => this.mapper.toPublic(i)),
      nextCursor: result.nextCursor,
    };
  }

  async update(id: string, ownerId: string, input: UpdateItemInput): Promise<OwnerItemResponse> {
    const existing = await this.repo.findByIdAndOwner(id, ownerId);

    if (TERMINAL_STATUSES.has(existing.status as any)) {
      throw new ItemInvalidStatus("update", existing.status);
    }

    let slug = existing.slug;
    if (input.title && input.title !== existing.title) {
      slug = await uniqueSlug(input.title, (s) => this.repo.slugExists(s));
    }

    const updated = await this.repo.update(id, {
      ...input,
      slug,
    });
    return this.mapper.toOwner(updated);
  }

  async publish(id: string, ownerId: string, input: PublishItemInput): Promise<OwnerItemResponse> {
    const existing = await this.repo.findByIdAndOwner(id, ownerId);

    if (existing.status !== "draft") {
      throw new ItemInvalidStatus("publish", existing.status);
    }

    if (existing.title === DEFAULT_TITLES.ITEM) {
      throw new DomainError("ITEM_NO_TITLE", "Please set a title before publishing.");
    }

    const updated = await this.repo.update(id, {
      status: "active",
      category: input.category,
      isPublished: true,
      publishedAt: new Date(),
    });
    return this.mapper.toOwner(updated);
  }

  async archive(id: string, ownerId: string): Promise<OwnerItemResponse> {
    const existing = await this.repo.findByIdAndOwner(id, ownerId);

    if (TERMINAL_STATUSES.has(existing.status as any)) {
      throw new ItemInvalidStatus("archive", existing.status);
    }

    const updated = await this.repo.update(id, { status: "archived" });
    return this.mapper.toOwner(updated);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const existing = await this.repo.findByIdAndOwner(id, ownerId);

    if (existing.status === "active") {
      throw new DomainError("ITEM_CANNOT_DELETE_ACTIVE", "Archive the item before deleting it.");
    }

    await this.repo.delete(id);
  }

  async confirmImage(
    id: string,
    ownerId: string,
    input: ConfirmImageInput,
  ): Promise<OwnerItemResponse> {
    const existing = await this.repo.findByIdAndOwner(id, ownerId);
    const imageCount = await this.repo.countImages(id);

    if (imageCount >= VALIDATION_RULES.MAX_IMAGES) {
      throw new DomainError(
        "ITEM_IMAGE_LIMIT",
        `Maximum of ${VALIDATION_RULES.MAX_IMAGES} images allowed.`,
      );
    }

    const image = await this.repo.addImage({
      itemId: id,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      source: input.source,
      isCover: input.source === "cover",
      sortOrder: imageCount,
      cropMetadata: input.cropMetadata ?? null,
    });

    if (input.source === "cover") {
      await this.repo.setCoverImage(id, image.id);
    }

    return this.getOwner(id, ownerId);
  }
}
```

---

### `items.factory.ts`

Wires dependencies together. The only place `new` is called.

```ts
import type { DatabaseOrTransaction } from "@workspace/database/client";
import type { AppEnvParsed } from "../../shared/env.ts";
import { ItemRepository } from "./items.repository.ts";
import { ItemService } from "./items.service.ts";
import { createItemMapper } from "./items.mapper.ts";

export const ItemFactory = {
  createService(db: DatabaseOrTransaction, env: AppEnvParsed): ItemService {
    const repo = new ItemRepository(db);
    const mapper = createItemMapper(env.ASSETS_BASE_URL);
    return new ItemService(repo, mapper);
  },
};
```

---

### `items.types.ts`

Re-export everything consumers need from a single import.

```ts
export type {
  PublicItemResponse,
  OwnerItemResponse,
  PublicItemImageResponse,
  ItemMapper,
} from "./items.mapper.ts";

export type {
  CreateItemInput,
  UpdateItemInput,
  PublishItemInput,
  ListItemsQuery,
  ConfirmImageInput,
} from "./items.schemas.ts";
```

---

### `routes/items.public.routes.ts`

Unauthenticated. Read-only. Mount first in `routes.ts`.

```ts
import { zValidator } from "@hono/zod-validator";
import { createRouter } from "../../../shared/router.ts";
import { handle } from "../../../shared/handler.ts";
import { listItemsQuerySchema } from "../items.schemas.ts";

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
```

### `routes/items.owner.routes.ts`

Authenticated. Write operations. Use `requireSession` middleware.

```ts
import { zValidator } from "@hono/zod-validator";
import { createRouter } from "../../../shared/router.ts";
import { handle, handleCreate, handleDelete } from "../../../shared/handler.ts";
import { requireSession } from "../../../shared/middleware/session.middleware.ts";
import {
  createItemSchema,
  updateItemSchema,
  publishItemSchema,
  confirmImageSchema,
} from "../items.schemas.ts";

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
```

---

## Final Directory Tree

```
starter/
├── biome.json
├── package.json
├── tsconfig.json
├── apps/
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── routes.ts
│           ├── container/
│           │   └── index.ts
│           ├── shared/
│           │   ├── env.ts
│           │   ├── handler.ts
│           │   ├── response.ts
│           │   ├── router.ts
│           │   ├── types.ts
│           │   ├── errors/
│           │   │   ├── exceptions.ts
│           │   │   └── handler.ts
│           │   └── middleware/
│           │       ├── container.middleware.ts
│           │       ├── db.middleware.ts
│           │       └── session.middleware.ts
│           └── modules/
│               └── items/
│                   ├── items.exceptions.ts
│                   ├── items.factory.ts
│                   ├── items.mapper.ts
│                   ├── items.repository.ts
│                   ├── items.schemas.ts
│                   ├── items.service.ts
│                   ├── items.types.ts
│                   └── routes/
│                       ├── items.owner.routes.ts
│                       └── items.public.routes.ts
└── packages/
    ├── api-client/
    │   ├── package.json
    │   └── src/
    │       └── index.ts
    ├── database/
    │   ├── drizzle.config.ts
    │   ├── package.json
    │   └── src/
    │       ├── client.ts
    │       ├── index.ts
    │       └── schema/
    │           ├── index.ts
    │           ├── shared.ts
    │           ├── utils.ts
    │           └── domains/
    │               └── items/
    │                   ├── item-images.table.ts
    │                   ├── item-relations.ts
    │                   └── items.table.ts
    └── shared/
        ├── package.json
        └── src/
            ├── index.ts
            └── constants/
                ├── index.ts
                └── items.ts
```

---

## Build Checklist for the Agent

1. **Scaffold directories** — create every folder in the tree above.
2. **Write all package.json files** — use exact workspace protocol (`"workspace:*"`) for internal deps.
3. **Write root `tsconfig.json`, `biome.json`** exactly as specified.
4. **Write `packages/shared`** — constants first (everything else imports from here).
5. **Write `packages/database`** — utils → shared fields → tables → relations → client → index.
6. **Write `apps/api/src/shared`** — types → env → errors → response → handler → router → middleware.
7. **Write the `items` module** in order: exceptions → schemas → mapper → repository → service → factory → types → routes.
8. **Write `apps/api/src/container/index.ts`** and **`routes.ts`** and **`index.ts`**.
9. **Write `packages/api-client/src/index.ts`**.
10. **Run `bun install`** from the root.
11. **Run `bun run dev`** from `apps/api` and confirm the server starts.
12. **Verify** `GET /items` returns `{ success: true, data: { items: [], nextCursor: null } }`.

---

## Key Invariants to Preserve

- Never call `db.transaction()` inside a service — only in `container.withTransaction()`.
- Never put DB queries in routes or business logic in repositories.
- `findById` always throws `NotFoundError`. `findBySlug` returns `null`.
- Public routes are mounted **before** owner routes in `routes.ts`.
- `PublicXxxResponse` never exposes `id`, `ownerId`, `adminNotes`, `status`, or `updatedAt`.
- All timestamps returned as ISO 8601 strings from the mapper — never raw `Date` objects.
- All response bodies are `{ success: true, data }` or `{ success: false, error }`.
- Slugs are always re-generated via `uniqueSlug()` when title changes.
- `TERMINAL_STATUSES` is a `Set` — check with `.has()`, not `===`.
- Constants never live inline — always imported from `@workspace/shared/constants`.
