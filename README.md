# Starter Monorepo

A full-stack Bun monorepo with a Hono API and a TanStack Start web app, deployed to Cloudflare Workers.

## Structure

```
apps/
  api/        Hono REST API (Bun)
  web/        TanStack Start (Cloudflare Workers)
packages/
  api-client/ Typed Hono RPC client
  database/   Drizzle ORM schema + client (PostgreSQL)
  shared/     Constants shared across all packages
  ui/         React component library (shadcn/Tailwind v4)
```

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker](https://www.docker.com) (for local Postgres)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`bun add -g wrangler`)

## Getting started

**1. Install dependencies**
```sh
bun install
```

**2. Start the database**
```sh
docker compose up -d
```

**3. Set up environment variables**
```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

**4. Run migrations**
```sh
bun run --filter '@workspace/database' db:generate
bun run --filter '@workspace/database' db:migrate
```

**5. Start dev servers**
```sh
bun dev   # starts both api (port 3001) and web (port 3000)
```

## Database

All database commands run from `packages/database`:

| Command | Description |
|---|---|
| `db:generate` | Generate a new migration from schema changes |
| `db:migrate` | Apply pending migrations |
| `db:push` | Push schema directly (dev only) |
| `db:studio` | Open Drizzle Studio |

```sh
bun run --filter '@workspace/database' db:migrate
```

## Adding a new domain

Copy the `items` module as a reference:

```
apps/api/src/modules/<domain>/
  <domain>.exceptions.ts
  <domain>.schemas.ts
  <domain>.mapper.ts
  <domain>.repository.ts
  <domain>.service.ts
  <domain>.factory.ts
  <domain>.types.ts
  routes/
    <domain>.public.routes.ts
    <domain>.owner.routes.ts
```

Then register the routes in `apps/api/src/routes.ts` and wire the factory in `apps/api/src/container/index.ts`.

## Deployment

**API** — runs on Bun. Deploy to any VPS or container platform.

**Web** — deploys to Cloudflare Workers:
```sh
cd apps/web
bun run deploy
```

## Auth

The session middleware (`apps/api/src/shared/middleware/session.middleware.ts`) ships with a minimal HS256 JWT verifier using the Web Crypto API. Replace it with your auth provider (Better Auth, Clerk, etc.) when ready.
