# 公開プレビュー設定の機能試験

対象: [仕様](../../specs/preview-config.md)。実DBへ接続せず、本番HTTPとメモリ保存先・架空ユーザーを使用する。

| ケース | 条件 | 手順・期待 | 対応する試験 | 結果 |
| --- | --- | --- | --- | --- |
| FT1 | AC1・AC2・AC4 | 本番設定の不足・不正を起動前に拒否し、正常設定だけを返す | Env.spec.tsの本番設定試験 | 成功 |
| FT2 | AC3 | ログイン・ログアウト・パスワード変更のCookieにSecureと同じ属性を付ける | PreviewConfig.spec.ts | 成功 |
| FT3 | AC5 | 正規Originのログイン・CSRF取得・更新・preflightが通る | PreviewConfig.spec.ts | 成功 |
| FT4 | AC5 | 別Origin・未知Host・CSRFなしの更新を拒否する | PreviewConfig.spec.ts | 成功 |
| FT5 | AC4 | ローカルのブラウザでログイン・更新・ログアウトする | Chromeでログイン・申請作成/提出・再読込・ログアウトを操作 | 成功（AI、2026-11-23 11:18〜11:19 JST） |

公開先のHTTPS・Cookie受理・公開ドメインは未実施。FT2〜FT4はHTTP注入試験であり、実TLS・ブラウザのCookie挙動を証明しない。FT5はAIによるブラウザ操作として実施者・日時を記録する。2026-11-23作成。
