# 本番APIコンテナのブラウザ機能試験

正本は[APIの申請・認可契約](../../API.md)、[本番設定AC3・AC5](../../specs/preview-config.md)、[コンテナAC4](../../specs/api-container.md)。本番API image・PostgreSQL16の使い捨てDB・本番ビルドWebを、固定localhostの同一HTTPS Originへ接続する。実施者はAI、2026-11-23。空のDBを再初期化した最終実行で全ケース成功。

| ケース | 確認する既存契約 | 対応する操作/証拠 | 結果 |
| --- | --- | --- | --- |
| FT1 | 本番Cookieと認証 | login、Secure/HttpOnly/SameSite、CSRFなし403 | 成功 |
| FT2 | 申請の状態遷移 | 作成・提出・差し戻し・修正保存・再提出・同じ承認者の承認 | 成功 |
| FT3 | チーム境界 | 別チームの一覧非表示と詳細APIの403 | 成功 |
| FT4 | 永続化と認証復帰 | API再起動後のauth/me 200・画面の承認済み/履歴 | 成功 |
| FT5 | Cookie削除 | logout後のログイン画面と認証Cookie不在 | 成功 |
| FT6 | 保存結果 | SQLでApproved・version 7・判断2件・承認者1人を照合 | 成功 |

自動操作は`tests/e2e/containerWorkflow.mjs`を使う。migration/seed/起動/停止は[作業結果の手順](../../work/container-workflow-e2e/result.md)に従う。機能・権限は変えず、今回新たな機能仕様書は作らない。

自己署名証明書を固定localhostだけで許容する試験であり、公開証明書の信頼・DNS・配信先は未検証。標準CIの392テストとは別のローカル試験である。

追加の安全確認: 初期化済みDBへのseed再実行は固定エラーで拒否し、users 4・requests 1・approvals 2を維持した。
