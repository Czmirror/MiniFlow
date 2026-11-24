# 承認済み申請の案内修正

承認済みの申請には、追加の承認操作がないことを日英で案内するよう修正した。提出前の案内が残り、完了後に何をすればよいか迷う表示を解消する。操作ボタン・認可・API・保存方式は変更していない。人間による文言と実画面の受け入れは未確認。

## 変更と検証

基点は2026-11-24にfetchしたmain `b7a376d`。PR #29はCI成功・レビュー指摘と未解決threadなしを確認してマージ済み。既存ホームページの変更は別worktreeで保護した。

`RequestDetailActions.approvalUnavailableMessage`でApprovedの案内を明示した。文言は共通辞書`messages.ts`に置き、UIの通信や権限判定を増やしていない。既存仕様RD4の不具合修正で、新しい機能仕様書は作成しない。レイアウト・CSSを変えないため設計図は対象外。仮の数値追加なし。

対象部品の33テストが成功した。追加12ケースは日英・Applicant/Approver/Admin・本人/他人の組み合わせを実際の本番componentで描画し、完了案内・操作ボタンと理由入力の不在・旧案内の不在を確認する。既存Draft/Pending/Rejected等の条件も維持した。

全体Profile初回は型検査まで成功し、404件中403件が成功した。既存の業務イベント試験1件が5秒でtimeoutし、build/secretsはRunnerがskipした。今回のcomponent変更とは別の試験であり、単独・直列実行で切り分けた。失敗を成功扱いにしない。2回目も既存6ケースが5秒のtimeoutとなった。単独の業務イベント試験は1.3秒で成功し、`pnpm test --maxWorkers=1 --no-file-parallelism`では31ファイル404件すべて成功した。個々のtestのtimeout・期待値・検証設定は変更していない。並列負荷による可能性はあるが、原因を断定しない。標準Profile全体のローカル成功とは区別し、CIの通常並列実行は成功した。

書式・型検査は標準Profileで成功した。直列の全404テストに加え、`NEXT_TELEMETRY_DISABLED=1 pnpm build`、秘密情報の限定検査、E2E moduleの構文検査、`git diff --check`も成功した。lintと依存脆弱性監査、CIの自動E2Eは既存どおり未整備。GitHubのCI/自動レビュー結果はPR本文に記録する。

## E2Eの実施結果（2026-11-24）

会話「投入して良いです、DB初期化への個別承認します」を受け、固定localhost:55449の使い捨て`miniflow_container_test`を再作成した。既存9件のmigrationと架空4ユーザーの投入が成功した。実ユーザー・共有DBには触れていない。

本番API image・PostgreSQL16・本番build Web・固定localhost HTTPSを使い、Playwright 1.65.1 / Chrome 158.0.8127.37の隔離contextで実施した。自己署名証明書の例外はこのcontextだけで、外部Originへの通信を拒否する。対象コードは`9679575`（以後は文書追記のみ）。

```sh
node tests/e2e/containerWorkflow.mjs /private/tmp/miniflow-e2e-tools /private/tmp/miniflow-guidance-approved-results
```

[実行JSON](evidence.json)の22項目すべてが成功した。新規FT17では承認直後に完了の案内・操作ボタンと理由入力の不在を確認し、API再起動後も同じ案内が保持された。画面画像もAIが確認した。人間による画面受け入れとは区別する。

既存21項目も成功し、承認フロー、Cookie/CSRF、チーム境界、ユーザー作成/属性変更/無効化、本人設定、日英切替、パスワード変更による2セッションの失効と旧パスワード拒否を確認した。HTTPの意図した拒否は401が9件・403が4件・400が3件、対応するconsole errorは16件。未知のHTTP/console errorとpage errorは0件。APIのlevel 50/60ログも0件だった。

SQLでもusers 5件、管理画面で作成したユーザーはApprover/team-2/無効、不正な作成ユーザーは0件と照合した。本人設定は「E2E 本人設定」・ja・sessionVersion 1。申請はApproved/version 7・判断履歴2件・同じ承認者1人。request IDは`538c2b42-89a8-4cf9-9b23-c3f0cc16f378`。パスワードhash、Cookie、tokenは証拠に含めない。

試験後はブラウザ・Web・proxyを停止し、専用ComposeのAPI/DB/networkを削除した。再実行手順は[既存のE2E手順](../container-workflow-e2e/result.md)と同じ。今回の再開では試験失敗やソース修正はなかった。

前回は自動承認レビューがDB初期化への個別承認を未確認として拒否し、実行せず停止した。今回の会話で個別承認を得てから再開したため、承認待ちは解消した。過去の停止を実行成功として書き換えない。

## 自己レビューと残課題

自己レビューはtests/docs-comments/security/dataの観点で、Approvedの説明分岐以外に操作条件の変更がないことを照合した。表示責務を既存component内に保ち、新たな層や認可実装の複製なし。空・読込中・失敗・欠けた履歴の既存試験を維持する。

公開先のTLS/DNS、共有デモ管理、CIの自動E2E、lint/依存脆弱性監査は今回の範囲外。次は公開先とデモ運用条件を具体化する。E2Eの必須確認を完了し、状態はHumanReview待ち。通常PRはマージしない。

再開後の変更は承認記録・試験結果・証拠JSONのみで、製品や試験コードは変更していない。設定・書式・秘密情報の限定検査と差分検査を確認し、既存404テストと本番buildの成功は前回の実行とCIで照合する。今回もE2E用のWeb本番buildは成功した。
