# MiniFlow

MiniFlow is a prototype approval workflow system designed to explore SaaS-style backend architecture.

The project focuses on building a small but structured workflow application using a modern TypeScript monorepo architecture.

It is also used as an experiment for AI-assisted development using tools such as Codex and Claude Code.

## Architecture

MiniFlow follows a simple monorepo architecture.

- `apps/web`  
  Next.js frontend
- `apps/api`  
  Fastify backend API
- `packages/shared`  
  Shared TypeScript types
- `docs`  
  Architecture and domain documentation

The backend is structured with domain / application / infrastructure layers so the system can grow into a larger workflow platform.

## Current Scope

The current milestone focuses on a reproducible local development base where `web + api + db` start, talk to each other, and save or read `Draft Request` records.

## Why this structure
- `apps/web`: Next.js frontend
- `apps/api`: Fastify API
- `packages/shared`: shared TypeScript types
- `docs`: product, architecture, API, and domain notes

This is intentionally simplified. The domain/application/infrastructure/presentation split is only lightly populated in `apps/api` so the project can grow into it instead of retrofitting it later.

## Directory overview
```text
miniflow/
  apps/
    api/
    web/
  packages/
    shared/
  docs/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
```

## Prerequisites
- Node.js 20+
- Corepack enabled (`corepack enable`)
- Docker Desktop

## Environment files
Create local env files from the examples.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The defaults already point to the local PostgreSQL container and local API.

## Install dependencies
```bash
corepack prepare pnpm@10.6.3 --activate
pnpm install
```

## Start PostgreSQL
```bash
docker compose up -d
```

The container starts PostgreSQL on `localhost:5432` with:
- user: `miniflow`
- password: `miniflow`
- database: `miniflow`

## Run Prisma migration
Create the `requests` table before starting the API.

```bash
pnpm db:migrate -- --name init_requests
```

## Start the API
```bash
pnpm dev:api
```

Expected health response:
```json
{
  "status": "ok",
  "service": "api",
  "db": "connected"
}
```

Manual check:
```bash
curl http://localhost:3001/health
```

Request creation check:
```bash
curl -X POST http://localhost:3001/requests \
  -H 'content-type: application/json' \
  -d '{"teamId":"team-1","title":"First draft","body":"Created from curl"}'
```

## Start the web app
In another terminal:

```bash
pnpm dev:web
```

Open [http://localhost:3100](http://localhost:3100), press `API health check 実行`, then submit the `POST /requests` form.
The page should display both the `/health` response and the created draft request response from the API.

## Notes
- This week still does not implement approval workflow logic in the API.
- The API now persists only `Draft` requests. Approval, reject, revise, and delete APIs are not wired yet.
- `createdBy` is temporarily injected in the API as a fixed UUID until authentication exists.
- Existing root-level prototype code is kept for reference. The runtime path for new API work now lives under `apps/api/src/domain`.

## Next steps
- Expand the new `apps/api/src/domain/request` model beyond draft creation
- Add request read endpoints
- Add frontend request list and detail screens

## Related documents
- [PRD](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
- [NFR](/Users/admin/WebPortfolio/MiniFlow/docs/NFR.md)
- [ERD](/Users/admin/WebPortfolio/MiniFlow/docs/ERD.md)
- [API](/Users/admin/WebPortfolio/MiniFlow/docs/API.md)
- [Implementation Guide](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
