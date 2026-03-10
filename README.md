# MiniFlow Week 1

MiniFlow is a monorepo for a small approval workflow system.
Week 1 focuses on one thing only: a reproducible local development base where `web + api + db` start and talk to each other.

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

## Start the web app
In another terminal:

```bash
pnpm dev:web
```

Open [http://localhost:3100](http://localhost:3100) and press `API health check 実行`.
The page should display the `/health` response from the API.

## Notes
- This week does not implement approval workflow logic in the API.
- Database access is only a connectivity check through `SELECT 1`.
- Prisma is not wired yet. It remains a candidate for the next phase.
- Existing root-level prototype code is kept for reference and is not part of the week 1 runtime path.

## Next steps
- Add Prisma schema and migrations
- Move the current Request prototype into `apps/api/src/domain`
- Add repository implementations in `apps/api/src/infrastructure`
- Add request creation/read endpoints
- Add frontend request list and detail screens

## Related documents
- [PRD](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
- [NFR](/Users/admin/WebPortfolio/MiniFlow/docs/NFR.md)
- [ERD](/Users/admin/WebPortfolio/MiniFlow/docs/ERD.md)
- [API](/Users/admin/WebPortfolio/MiniFlow/docs/API.md)
- [Implementation Guide](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
