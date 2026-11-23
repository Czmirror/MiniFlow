# APIの本番コンテナ

公開先へ運べるAPI成果物を作る。Web・TLS終端・配信先の作成とデプロイは対象外。

- AC1: Node 22系の公式イメージをdigest固定し、lockfileの依存からAPIをビルドする。未知のlifecycle scriptは実行せず、Prisma Clientの生成を明示する。
- AC2: 最終イメージは非rootでビルド済みJavaScriptを直接実行し、開発サーバーとビルドツールを起動しない。NODE_ENV=productionを既定にする。
- AC3: .env・秘密鍵・Git・Harness・ローカル依存・テストをビルドcontextへ含めない。必要な入力だけを許可する。
- AC4: 本番設定不足は起動時に拒否し、設定済みならAPIが応答する。設定の実値はimageへ焼き込まない。migrationはビルド・起動時に実行しない。

接続先DBの存在・証明書・認証は運用環境で別途確認する。[本番設定](preview-config.md)の契約は維持する。
関連: [計画](../work/preview-api-container/plan.md)、[機能試験](../tests/functional/api-container.md)。2026-11-23作成。
