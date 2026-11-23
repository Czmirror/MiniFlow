# 公開プレビュー設定の単体試験

対象: `apps/api/src/infrastructure/config/env.ts`の`getEnv`。[仕様](../../specs/preview-config.md)の入力検証を確認する。値の詳細と期待値は`tests/apps/api/config/Env.spec.ts`を正本とする。

| ケース | 観点 | 対応するtest | 結果 |
| --- | --- | --- | --- |
| UT1 | 既定のローカルHTTP、環境名の許可・未知値拒否 | ローカルHTTPの既定値を維持する / 未知の環境名を拒否する | 成功 |
| UT2 | 本番の必須Origin・Host・DBとHTTPS | 本番では明示的なHTTPS Originが必要 / 本番ではHostとDBの明示指定が必要 / 本番ではPostgreSQL接続URLだけを受け付ける | 成功 |
| UT3 | 本番鍵のバイト長の境界・秘密の非表示 | 本番の鍵はUTF-8で32バイト以上が必要 / 設定エラーに秘密の実値を出さない | 成功 |
| UT4 | 環境とHTTPSによるCookie指定 | HTTPSまたは本番ではSecure Cookieを指定する | 成功 |

実DBの接続確認は対象外。2026-11-23作成。
