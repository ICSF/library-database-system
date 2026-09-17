# Library Database System

Library management system for the Imperial Sci-fi Fantasy Society.

This repository is a monorepo managed by `pnpm`.
The database is PostgreSQL, currently hosted by Supabase, but the application talks to it
through Prisma. This has two benefits: it gives us a type-safe query layer generated from the schema, and it keeps the application portable to a different PostgreSQL host later.

---

## Table of Contents

- [Repository Structure](#repository-structure)
- [Requirements](#requirements)
- [Initial Setup](#initial-setup)
- [Development](#development)
- [Checks and Builds](#checks-and-builds)
- [Vercel Deployment](#vercel-deployment)

---

## Repository Structure

```text
.
├── api/                       Vercel serverless function entry points
│   └── [trpc].ts              Exposes the tRPC router at /api/*
├── apps/
│   ├── mobile/                Reserved for the future mobile application
│   └── web/                   React + Vite browser application
├── packages/
│   ├── api/                   tRPC router and local API server
│   ├── config/                Shared server environment loading and validation
│   └── db/                    Prisma schema, generated client, and DB access
├── .env.example               Safe .env template for local environment variables
├── package.json               Root scripts and workspace dependencies
├── pnpm-lock.yaml             Locked dependency versions
├── pnpm-workspace.yaml        pnpm workspace configuration
└── tsconfig.json              Root TypeScript configuration
```

### `apps/web`

The React frontend, built with Vite. Consumes the tRPC router from @library/api.

### `apps/mobile`


### `packages/api`

Owns the application API. 
- `index.ts` defines the tRPC router and procedures,
- `server.ts` starts a long-running HTTP server for local development.

During production on Vercel, the router defined here is not run via `server.ts`. Instead, Vercel invokes the serverless
function in the root `api/` directory once per request.

### `packages/db`

Owns database access. Nothing outside this package should query the db directly.
- `prisma/schema.prisma` is the database schema,
- `prisma7.config.ts` configures Prisma CLI commands
- `index.ts` creates and exports the Prisma client instance used by the API.
- `generated/prisma` is generated client output and is ignored by Git.

### Database Commands

```bash
pnpm --filter @library/db generate # reads prisma/schema.prisma and produces the Prisma Client
pnpm --filter @library/db studio # launches a local web GUI that connects to your database
```

### `packages/config`

Loads the repository `.env` file and validates server variables with Zod at startup, so that misconfiguration fails fast.
Backend code should use the exported `env` object instead of reading
`process.env` directly. 

DO NOT import this package into browser code (`apps/web/src/`) because it
contains server secrets such as `DATABASE_URL`.

## Requirements

- Node.js 22 or newer
- pnpm 12.3.4, as specified by `package.json`
- A PostgreSQL database, currently Supabase

## Initial Setup

From the repository root:

```bash
pnpm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to the PostgreSQL connection string.
The real `.env` file is ignored by Git and must never be committed.

Frontend variables must begin with `VITE_` to be exposed by Vite. Never put
database credentials in a `VITE_*` variable.

## Development

Generate the Prisma client:

```bash
pnpm --filter @library/db generate
```

Start the API and web application in separate terminals:

```bash
pnpm --filter @library/api dev
pnpm --filter @library/web dev
```

Alternatively, the root script runs both in parallel in a single terminal:

```bash
pnpm dev
```

The API listens on the configured `PORT` in .env (default 4000). Vite normally serves the web application on port
`5173`.


## Checks and Builds

```bash
pnpm --filter @library/api typecheck
pnpm --filter @library/web lint
pnpm --filter @library/web build
pnpm exec tsc --noEmit
```

Root scripts:

```bash
pnpm dev       # runs the API and the web app concurrently
pnpm build     # runs workspace build scripts
pnpm start     # runs workspace start scripts, where defined
```

## Vercel Deployment

The repository is designed for one Vercel project containing both the web app
and the API function. The root function is:

```text
api/[trpc].ts
```

It imports the router from `@library/api` and exposes procedures below `/api/`.

Configure the Vercel project with:

```text
Root Directory: .
Framework Preset: Other
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @library/db generate && pnpm --filter @library/web build
Output Directory: apps/web/dist
```

Add these Vercel environment variables:

```text
DATABASE_URL=your PostgreSQL connection string
NODE_ENV=production
```

For the production DATABASE_URL, use Supabase's **transaction pooler** connection string, rather than the direct connection. This is ideal for serverless functions, as is deployed on Vercel.

Vercel deploys new commits automatically when connected to GitHub.

//TODO:
- write abt pulling from db when schema changes
- say use session pooler/direct connection url when developing.