# Web経由のAPI接続試験

[仕様](../../specs/same-origin-preview.md)を専用Web/API/PostgreSQLと隔離Chromeで確認する。実施者AI、2026-11-26。

| ID | 条件 | 手順/期待 | 結果 |
| --- | --- | --- | --- |
| FT1 | AC1 | Docker buildで転送あり、通常buildで転送なし | 成功 |
| FT2 | AC2/AC3 | API port非公開を照合、未認証401と不正Origin403がWeb経由でno-store、queryを含む取得が通る | 成功 |
| FT3 | AC2/AC3 | 同じWeb imageで23項目を実施し、Cookie/CSRF/権限/保存が維持される | 成功 |
| FT4 | AC4 | HTML200/no-cache/noindexとstatic200/immutable、image/Next build IDを照合 | 成功 |

[結果](../../work/same-origin-preview/result.md)へ証拠を残す。公開TLS/DNS/CDN・負荷・複数ブラウザは未検証。

## Railway内部名の追加確認（2026-11-26）

| ID | 条件 | 手順/期待 | 結果 |
| --- | --- | --- | --- |
| RFT1 | AC1 | compose既定/railway固定先と空/未知拒否を単体確認 | 成功 |
| RFT2 | AC1/AC2/AC3 | Railway指定のWeb imageと内部DNS aliasで23項目・no-store/SQLを確認 | 成功 |

実Railwayのプラン/残枠/HTTPS/サービス起動は接続後に確認する。ローカルalias試験を実公開の成功にしない。
