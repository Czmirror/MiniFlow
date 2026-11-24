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
| FT7 | 管理者のユーザー発行 | 画面で1ユーザーを作成し201と一覧反映を確認 | 成功 |
| FT8 | 管理者限定の認可 | 一般ユーザーの管理画面非表示・一覧と有効CSRF付き作成の403 | 成功 |
| FT9 | 管理者の属性更新 | 表示名・所属・ロールを画面で変更し、既存セッションと読み取り専用表示へ反映 | 成功 |
| FT10 | 無効化 | 管理画面の無効化後、既存セッション401と再login 400を確認 | 成功 |
| FT11 | 保存と拒否の照合 | SQLでusers 5・対象Approver/team-2/無効、拒否したユーザーの不在を確認 | 成功 |

自動操作は`tests/e2e/containerWorkflow.mjs`を使う。migration/seed/起動/停止は[作業結果の手順](../../work/container-workflow-e2e/result.md)に従う。機能・権限は変えず、今回新たな機能仕様書は作らない。

自己署名証明書を固定localhostだけで許容する試験であり、公開証明書の信頼・DNS・配信先は未検証。標準CIの392テストとは別のローカル試験である。

前回実行の追加の安全確認: 初期化済みDBへのseed再実行は固定エラーで拒否し、users 4・requests 1・approvals 2を維持した。

管理者操作は`tests/e2e/adminManagement.mjs`で既存のlogin/復帰を再利用する。[管理者E2Eの結果](../../work/admin-management-e2e/result.md)を参照。

## 本人設定とパスワード変更（2026-11-24）

API AC4に対し`tests/e2e/accountSecurity.mjs`を追加する。実施結果は[本人設定E2E](../../work/account-security-e2e/result.md)に記録する。

| ケース | 操作と期待結果 | 結果 |
| --- | --- | --- |
| FT12 | 表示名・英語を保存し設定画面と再読込後に保持する | 成功 |
| FT13 | 現在パスワードの不一致を400で拒否し、両セッションを維持する | 成功 |
| FT14 | 正しい変更は200、操作側Cookie削除と別セッション401 | 成功 |
| FT15 | 旧パスワードは400、新パスワードでは200で再ログイン | 成功 |
| FT16 | 日本語へ戻せ、SQLで表示名・言語・認証世代1を確認する | 成功 |

## 承認済みの操作案内

RD4の既存条件を照合する。実施結果は[案内修正の結果](../../work/request-action-guidance/result.md)に記録する。

| ケース | 操作と期待結果 | 結果 |
| --- | --- | --- |
| FT17 | 承認後は「承認完了」の案内と操作なし。API再起動後も同じ案内を表示する | 成功 |
