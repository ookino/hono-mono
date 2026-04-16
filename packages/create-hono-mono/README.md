# create-hono-mono

Scaffold a full-stack Bun monorepo in seconds.

```sh
npx @ookino/create-hono-mono
```

## What you get

```
apps/
  api/        Hono REST API with Drizzle + PostgreSQL
  web/        TanStack Start frontend
packages/
  api-client/ Typed Hono RPC client (end-to-end type safety)
  database/   Drizzle ORM schema + migrations
  shared/     Constants shared across all packages
  ui/         React component library (shadcn + Tailwind v4)
```

## Deployment targets

Choose your deployment strategy during setup:

| Option | API | Web |
|---|---|---|
| **Mixed** | Bun + Postgres | Cloudflare Workers |
| **Bun stack** | Bun + Postgres | Bun (self-hosted) |
| **Cloudflare Workers** | CF Workers + Hyperdrive | CF Workers |

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker](https://www.docker.com) (for local Postgres — not needed for CF Workers target)
- A [Cloudflare](https://cloudflare.com) account (for CF Workers targets)

## Getting started

```sh
npx @ookino/create-hono-mono
cd my-app
cp apps/api/.env.example apps/api/.env
docker compose up -d
bun run --filter '@workspace/database' db:migrate
bun dev
```

## Stack

- **[Hono](https://hono.dev)** — fast, lightweight API framework
- **[Drizzle ORM](https://orm.drizzle.team)** — type-safe SQL with migrations
- **[TanStack Start](https://tanstack.com/start)** — full-stack React with SSR
- **[TanStack Query](https://tanstack.com/query)** — async state management
- **[TanStack Router](https://tanstack.com/router)** — fully type-safe routing
- **[shadcn/ui](https://ui.shadcn.com)** — accessible component library
- **[Tailwind CSS v4](https://tailwindcss.com)** — utility-first styling
- **[Biome](https://biomejs.dev)** — fast linter and formatter
