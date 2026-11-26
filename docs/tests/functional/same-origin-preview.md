# Web経由のAPI接続試験

[仕様](../../specs/same-origin-preview.md)を専用Web/API/PostgreSQLと隔離Chromeで確認する。実施者AI、2026-11-26。

| ID | 条件 | 手順/期待 | 結果 |
| --- | --- | --- | --- |
| FT1 | AC1 | Docker buildで転送あり、通常buildで転送なし | 未実施 |
| FT2 | AC2/AC3 | API port非公開を照合、未認証401と不正Origin403がWeb経由でno-store、queryを含む取得が通る | 未実施 |
| FT3 | AC2/AC3 | 同じWeb imageで23項目を実施し、Cookie/CSRF/権限/保存が維持される | 未実施 |
| FT4 | AC4 | HTML200/no-cache/noindexとstatic200/immutable、image/Next build IDを照合 | 未実施 |

[結果](../../work/same-origin-preview/result.md)へ証拠を残す。公開TLS/DNS/CDN・負荷・複数ブラウザは未検証。
