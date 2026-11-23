# 管理者のユーザー管理をE2Eで確認する

2026-11-23の会話「PR作成問題なければマージして、e2e」に基づく。PR #27のレビュー/CIと未解決threadなしを確認してマージした。基点はfetch済みmain `7cf43f7`。別worktreeで既存ホームページ作業を保護する。

既存APIのAdmin限定ユーザー管理を、前回の本番API image・実PostgreSQL16・本番build Web・固定localhost HTTPSで検証する。新機能・認証契約・UI・依存・CIは変更しない。

1. 前回の専用Composeと固定DB/port、空DB seed、HTTPS proxy、隔離Playwright toolsを再利用する。既存の.envや実ユーザーは使わない。専用DBへ9件の既存migrationと架空4ユーザーを投入する。終了後は専用コンテナをdownする。
2. 管理者が架空ユーザー1人を画面から作成し、一般ユーザーには管理画面がなく、有効なCSRF付きでも一覧/作成APIが拒否されることを確認する。
3. 管理者が表示名・所属・roleを変更し、既存セッションの再読込と作成画面の所属表示へ反映されることを確認する。
4. 管理者が対象ユーザーを無効化し、既存セッションの401と再loginの拒否を確認する。管理者自身や最後の管理者は変更しない。
5. 既存の承認フロー9項目も全て再実行し、SQLと画面/結果JSONで照合する。Profile・独立レビュー後に通常PRへまとめ、新規PRはマージしない。

既存login/復帰helperを注入して同じ設定を再利用する。containerWorkflowはブラウザ寿命と結果、adminManagementは管理画面のシナリオを担当する。意図した拒否は対象セッション・URL・method・statusを限定したcallbackで登録し、未知の失敗は引き続き失敗とする。認可の本番実装をtest側へ複製しない。

Security→管理者UI/一般ユーザー拒否/無効化。Database→固定の使い捨てDBだけにschemaと架空データを作成し、SQLでusers 5と対象role/team/isActiveを照合する。Sensitive data→token/passwordは証拠へ出さず、画像は架空データだけ。Quality→既存9項目と追加5項目を実行する。

機能仕様は既存docs/API.md、試験はdocs/tests/functional/container-workflow-e2e.mdへ追加する。新たな業務仕様・単体ロジックはないため、仕様書と形式的なunit testを追加しない。再有効化後のtoken寿命や管理者自己更新は今回の対象外。

自己署名証明書の例外は固定localhostの新規contextだけで、公開証明書やOSの信頼設定を変えない。実公開先TLS/DNS、複数ブラウザ、英語全画面、lint/脆弱性監査/CIの自動E2Eは未確認/未整備として残す。試験インフラの信頼境界は前回計画の図を維持する。
