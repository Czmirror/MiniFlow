# 技術スタック

- pnpm 10.6.3のworkspace。Node.jsはHarnessのため22以上を使用する。
- apps/web: Next.js 15（導入時の実行版15.5.12）、React 19、TypeScript。
- apps/api: Fastify 5、Prisma 6、PostgreSQL、TypeScript。
- packages/shared: 共有型。tests/**/*.spec.ts: Vitestによる既存テスト。
- 既存コマンド: pnpm typecheck、pnpm build。テストは pnpm exec vitest run。
- Vitest設定はあるがpackage.jsonにVitest依存宣言がない。導入時点ではnode_modulesに存在するがクリーンinstallでの再現性は未確認。依存追加は今回の対象外。
- 検証の定義は .harness/project.json、導入と更新の手順は .harness/README.md。
