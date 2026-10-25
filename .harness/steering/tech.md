# 技術スタック

- pnpm 10.6.3のworkspace。Node.jsはHarnessとViteのため22.12以上を使用する。
- apps/web: Next.js 15（導入時の実行版15.5.12）、React 19、TypeScript。
- apps/api: Fastify 5、Prisma 6、PostgreSQL、TypeScript。
- packages/shared: 共有型。tests/**/*.spec.ts: Vitestによる既存テスト。
- 検証コマンド: pnpm typecheck（workspaceとroot/tests）、pnpm test、pnpm build。
- ルートにVitest 3.2.7系、TypeScript 5.9.3系、@types/node 24系を直接宣言し、pnpm-lock.yamlで解決版を固定する。
- クリーン環境では pnpm install --frozen-lockfile --ignore-scripts の後に pnpm db:generate でPrisma Clientを明示生成する。
- lintは未整備。型検査は未使用PromiseやDOMの安全性などを網羅しない。
- 検証の定義は .harness/project.json、導入と更新の手順は .harness/README.md。
