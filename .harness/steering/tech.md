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

## 配信

- Web imageは既定で同一Originの`/api`へ接続する。公開API接続先はbuild時に固定され、実行時のenv変更では変わらない。秘密をbuild引数に渡さない。
- Web/APIの公開配信先・TLS終端は未作成。ローカルE2Eだけ既存HTTPS proxyを使う。Nextのbuild IDとDocker image IDで成果物を照合し、HTML/staticの実HTTP headerを記録する。
- 性能の目標は未定。今回、imageサイズの記録は行うが性能改善の主張はしない。

- APIは成功・エラー・空応答を含めて`Cache-Control: no-store`とする。WebのHTML/staticのcache方針は別に維持する。公開先のheader上書きは配信時に確認する。

- Docker用Webは/apiを内部http://api:3001へ転送する。APIの許可Hostはapi:3001。TLS入口はWebだけへ接続し、APIを直接公開しない。公開先のTLS/アクセス制限は未作成。
