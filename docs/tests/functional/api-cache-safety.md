# API応答の保存禁止の試験

[仕様](../../specs/api-cache-safety.md)を本番HTTPの注入試験と専用コンテナのChromeで確認する。実施者AI、2026-11-25。

| ID | 条件 | 確認 | 対応試験 | 結果 |
| --- | --- | --- | --- | --- |
| FT1 | AC1 | 認証/本人/申請/管理/CSRF/空応答とHEAD/OPTIONS | ApiCacheControl.spec.ts | 未実施 |
| FT2 | AC2 | 400/401/403/404/500でも保存禁止、status/body維持 | ApiCacheControl.spec.ts | 未実施 |
| FT3 | AC3 | 既存22項目と全APIのno-storeを実応答で照合 | containerWorkflow.mjs | 未実施 |

Cookieや本文の生値は記録しない。公開DNS/TLS/CDNのcacheは未検証。[結果](../../work/api-cache-safety/result.md)へ記録する。
