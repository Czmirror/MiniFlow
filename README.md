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

The current milestone now covers:
- local startup for `web + api + db`
- cookie-based authentication with CSRF protection
- request draft creation, update, submit, approve, reject, revise, delete
- request list/detail retrieval, including approval history on detail

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
For local auth development, set a non-empty `JWT_SECRET` in `apps/api/.env`.

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
Create or update the local schema before starting the API.

```bash
corepack pnpm --filter @miniflow/api exec prisma migrate dev
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

Register and login check:
```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"demo@example.com","password":"password1234"}'
```

```bash
curl -i -X POST http://localhost:3001/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@example.com","password":"password1234"}'
```

## Start the web app
In another terminal:

```bash
pnpm dev:web
```

Open [http://localhost:3100](http://localhost:3100), then:
1. run the health check
2. login or register from the auth panel
3. create a draft request
4. inspect and transition requests from the workflow panel

## Notes
- Auth now uses `httpOnly` cookie + CSRF token instead of `localStorage`.
- This is still a minimal auth slice. It does not yet implement roles, team membership, or `ApproverPolicy`.
- Existing root-level prototype code is kept for reference. The runtime path for new API work now lives under `apps/api/src/domain`.
- The workflow panel is intentionally a verification UI. It is not yet a polished product screen.

## Next steps
- Introduce `ApproverPolicy` after actor resolution is stable
- Replace the verification-oriented workflow UI with dedicated request screens
- Expand auth from simple current-user resolution into real authorization rules

## Related documents
- [PRD](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
- [NFR](/Users/admin/WebPortfolio/MiniFlow/docs/NFR.md)
- [ERD](/Users/admin/WebPortfolio/MiniFlow/docs/ERD.md)
- [API](/Users/admin/WebPortfolio/MiniFlow/docs/API.md)
- [Implementation Guide](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
