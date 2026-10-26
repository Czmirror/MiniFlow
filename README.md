# MiniFlow

MiniFlow is a prototype approval workflow system designed to explore SaaS-style backend architecture.

The project focuses on building a small but structured workflow application using a modern TypeScript monorepo architecture.

It is also used as an experiment for AI-assisted development using tools such as Codex and Claude Code.

## Architecture

MiniFlow follows a simple monorepo architecture.

- `apps/web`\
  Next.js frontend
- `apps/api`\
  Fastify backend API
- `packages/shared`\
  Shared TypeScript types
- `docs`\
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
- Node.js 22.12+（AI開発ハーネスを含む検証環境）
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

公開登録は提供しません。APIの起動前に `JWT_SECRET` を環境から渡し、必要なschema適用と初期管理者の作成を [ローカル運用手順](docs/runbook.md) に従って行ってください。schema適用と実際の管理者作成は、コード生成とは別のDB操作です。

## Start the web app
In another terminal:

```bash
pnpm dev:web
```

Open [http://localhost:3100](http://localhost:3100), then:
1. run the health check
2. 管理者が作成したアカウントでログインする
3. create a draft request
4. inspect and transition requests from the workflow panel

## Notes
- Auth now uses `httpOnly` cookie + CSRF token instead of `localStorage`.
- 認証は8時間で期限切れになり、パスワード変更時は全セッションが失効します。ユーザー・所属・roleは管理者が管理します。
- The API implementation and its tests use `apps/api/src`. The old root-level domain/application prototype has been removed after migrating its tests.
- The workflow panel is intentionally a verification UI. It is not yet a polished product screen.

## Next steps
- RoleとApproverPolicyの責務整理は、実装済みの認可条件を保った別計画で扱う
- Replace the verification-oriented workflow UI with dedicated request screens
- Expand auth from simple current-user resolution into real authorization rules

## Related documents
- [PRD](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
- [NFR](/Users/admin/WebPortfolio/MiniFlow/docs/NFR.md)
- [ERD](/Users/admin/WebPortfolio/MiniFlow/docs/ERD.md)
- [API](/Users/admin/WebPortfolio/MiniFlow/docs/API.md)
- [Implementation Guide](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)

## 検証環境

Git submoduleを含めてcloneする場合は `git clone --recurse-submodules` を使う。既存のcloneでは `git submodule update --init --recursive` を実行する。Node.js 22.12以上、pnpm 10.6.3を使用する。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
node .harness/upstream/scripts/validate.mjs --execute
```

installではライフサイクルスクリプトを実行せず、Prisma Clientは明示的に生成する。`db:generate` はコード生成であり、DBへのmigration適用は行わない。生成時に必要なPrisma engineが手元にない場合は取得が必要。通常の `pnpm typecheck` は各workspaceに加え、ルートのテストと生成済みAPI型を検査する。テストはDB接続なしで現行のAPI実装を呼ぶ。HTTP/CORS/画面の一部は既存の文字列検査が残り、実ブラウザや実DBの保証は含まない。

テストの移行対応は [申請テストの案内](docs/templates/request-state-transition.md)、全体の残課題は [レビュー記録](docs/work/harness-source-review/review.md) を参照する。lintは未導入のためハーネスで理由付きskipとし、型検査やbuildがlintの代わりに全問題を検出するとは扱わない。
