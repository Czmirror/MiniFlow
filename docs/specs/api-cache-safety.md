# API応答の保存禁止

目的は個人情報・申請・認証応答がブラウザや共有cacheへ保存されるリスクを抑えること。APIの送信方針に限定し、WebのHTML/static、認証/権限/データ形式を変更しない。

- AC1: 本番HTTPの全API応答はCache-Control: no-storeを持つ。ログイン、本人情報、申請、管理、CSRF、更新、空応答を含む。
- AC2: 認証なし、権限/Host/Origin/CSRF拒否、入力不正、未存在、内部エラーも同じ方針を持つ。本文/statusとCookieは既存契約を維持する。
- AC3: 本番Web/API/PostgreSQLの既存22項目が成功し、ブラウザが観測する全API応答で保存禁止を確認できる。Cookieや本文を証拠へ保存しない。

既に保存されたcacheを消去する機能ではない。履歴・画面・メモリの消去は保証しない。公開先がheaderを上書きしないことは配信時に別途確認する。

[計画](../work/api-cache-safety/plan.md)・[試験](../tests/functional/api-cache-safety.md)。2026-11-25。
