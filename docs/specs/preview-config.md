# 公開プレビューの起動設定

公開前の設定漏れをAPIの起動時に検出する。公開先の作成・デプロイ・共有DBの変更はこの仕様に含めない。

- AC1: `NODE_ENV=production`では、明示したHTTPSの`CORS_ORIGIN`、空でない`API_ALLOWED_HOSTS`、PostgreSQLの`DATABASE_URL`を必須にする。DB接続先の実値はエラーへ含めない。
- AC2: 本番の`JWT_SECRET`はUTF-8で32バイト以上とする。長さは乱数の強度を保証しないため、運用者が専用の十分な乱数から生成して秘密設定へ保存する。[RFC 7518 §3.2](https://www.rfc-editor.org/rfc/rfc7518#section-3.2)のHS256の鍵長に合わせる。
- AC3: Cookieの`Secure`は検証済み設定で決める。本番、またはHTTPSの画面Originでは有効にし、ログイン・ログアウト・パスワード変更で同じ条件を使う。認証CookieのHttpOnly、SameSite=Lax、8時間の期限は維持する。
- AC4: `NODE_ENV`は未指定（development）、development、test、productionを許可し、未知・空の値を拒否する。既存のローカルHTTP開発の既定値は維持する。
- AC5: 正規のHTTPS OriginとHostで認証・CSRF付き更新が通り、別Origin・未知Host・CSRFなしの更新は拒否する。

APIのHTTPSは配信基盤で終端する。転送ヘッダーを信頼する変更は行わない。ブラウザのCookie受理と実際のTLS・同一サイト構成は公開先で別途確認する。

関連: [計画](../work/preview-config/plan.md)、[機能試験](../tests/functional/preview-config.md)、[単体試験](../tests/unit/preview-config.md)。2026-11-23更新。
