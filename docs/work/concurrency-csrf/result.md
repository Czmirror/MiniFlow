# 第3段階の実施記録

同時更新で申請状態・承認履歴が壊れないよう、取得時の保存世代を照合します。
複数タブの正規操作を通すため、CSRFをログインセッションへ結び付けます。
競合時は入力を保持して再取得を案内し、変更を自動で再送しません。
既存DBへのschema適用と、人間による最終差分レビューは別途必要です。

## 対象と承認

2026-10-26。基点 `d658dbb78b8b64ffd0b24b4e19133866fdb658c4`、branch `codex/concurrency-csrf`。
PR #5マージを確認し、cleanなmainをfetch後にfast-forwardした。第3段階の計画・重要仕様・使い捨てDBの操作範囲・独立レビュー・通常PRまで提示し、会話のユーザー「ok」で承認された。共有/既存DBへの適用、実アカウント作成は含まない。

## 実装と責務

Requestは取得時versionを全遷移で保持し、PrismaRequestRepositoryが保存時だけincrementする。通常更新とapprove/rejectはid+version一致を要求し、P2025だけをStateConflictErrorへ変換する。決定の状態更新と履歴INSERTは同じtransaction。内部versionはDTOへ返さない。
CSRFはJWT署名済みsidからHMACで生成し、cookie/headerをそれぞれ現在sessionと照合する。旧ランダムtokenは拒否し、GET取得はcookieを更新せずno-storeを返す。Webは完了tokenを長期保持せず、未完了取得だけ共有し、認証初期化前の遅い取得を使わない。
operationEventsは応答後に固定fieldだけ記録する。成功は保存後だけで、未登録GET等の500も安全な固定actionで記録する。入力本文・理由・cookie・JWT・email・生例外は出さない。既存の各層errorログを削除して重複を防いだ。
既存の権限・team/owner・申請遷移・JWT8時間・password全失効は維持した。公開DTOの追加、依存追加、Harness/CI基準の緩和はない。OpenAPIは既存ローカル7.13.0で生成し、直接依存宣言の未整備は残る。

## 受け入れ条件と証拠

| 条件 | 対応と確認範囲 |
| --- | --- |
| AC1/AC2 | 専用PostgreSQLの7シナリオで競合とrollback成功。version0からの保存、全遷移引継ぎ、競合分類はRequestVersionsと既存保存契約試験 |
| AC3 | CsrfSessionsで安定取得、cookie不変、no-store、別session/改ざん/旧方式拒否。AuthInputsのJWT拒否試験は有効sid付きで期限/世代を独立に検査し、sid欠落も別に拒否 |
| AC4 | 実ブラウザ2タブ同時保存200双方、別タブ再login後の元タブ保存200。SessionExpiryで未完了取得共有・失敗後再取得・認証初期化時の古い取得拒否 |
| AC5 | OperationEventsで成功/409/500、秘密・自由文不出力、500あたりerror1件。永続監査台帳の保証ではない |
| AC6 | DTO内部version非露出、既存HTTP/domain/usecase回帰。最終の全体検証結果は下記 |

仕様の正本は `docs/API.md`、運用は `docs/runbook.md`。機能試験と単体試験の正本は `docs/tests/functional/concurrency-csrf.md` と `docs/tests/unit/concurrency-csrf.md`。旧作業草案は案内へ置換し、二重仕様を残していない。

## 実DB検証

既存ローカルimage postgres:16-alpineで専用コンテナ `miniflow-stage3-test-20261026` を作成し、tmpfsのみ、公開portは127.0.0.1の空きportに限定した。新規image pull・既存volume mount・privilegedは使わない。専用DBは `miniflow_stage3_test`、架空userは `miniflow_test`。trust認証はこのloopbackの短命DBだけで、既存の秘密を使っていない。
全9 migrationを適用成功。新しいrequests.version列と前段のusers.sessionVersion列を含む。実施は専用DBだけで、既存.envの実値は読まず接続先を明示注入した。Prismaは環境ファイル読込の通知を出したが、値の表示や既存DBへの接続は行っていない。
`tests/integration/requestConcurrency.integration.ts`は本番usecase/repositoryを使い、2読取の同期だけを試験側で調整した。同時approve/approve、approve/reject、edit/edit、edit/submit、差し戻し後の同actor再決定、deleteとの競合、履歴UUID違反時の状態/version rollbackの7シナリオが成功した。
使い捨てコンテナは `docker rm --force` で今回の対象だけを削除済み。tmpfsの架空データも破棄した。既存コンテナ/volume/imageは変更していない。既存DBのlock時間・データ移行・バックアップ復旧は未確認。

## ブラウザ検証

AI操作、2026-10-26。Next.js43100 + 架空ユーザーのメモリAPI43101を使用した。既存の秘密・実ユーザー・DBを使っていない。
2タブで同時にプロフィール保存し、双方の「保存成功」とPATCH200を確認。Bでlogout/relogin後もAが現在のCSRFを取得して保存200。別Origin43102のフォームPOSTは403で拒否した。
409表示は固定409応答fixtureで、再取得案内・入力保持・ログイン維持を確認。最初の保存先例外注入fixtureはmodule境界の違いで500となり、固定応答へ修正した。UI検証と実DBの競合は別々であり、一体化した並行ブラウザ試験とは扱わない。
初回のブラウザ接続timeoutは表示済みタブの再取得で復旧した。Bの再loginは既定demoメールのままの初回だけ400となり、架空メールを指定して成功。全ての仮サーバー・検証タブは停止/閉鎖済み。
証拠はGit対象外 `.harness/reports/stage3-tab-a-saved.png`、`stage3-origin-rejected.png`、`stage3-conflict-message.png`。
実時間8時間待ち・ブラウザpassword変更・実データの移行復旧は未実施。前段のpassword全失効のHTTP回帰とは区別する。

## 検証とレビュー

標準テストはホスト高負荷と同時に複数回timeoutした。load averagesの実測は142.60だった。並行起動を止めた再実行でも時間切れがあり、Runnerの成功へ読み替えていない。
fixtureの固定password hashをprocess内で再利用し、ログ試験の不要な二重サーバー構築を除去した。互いに独立したログイン照合を並行実行した。保存先・userは各試験独立で、本番hash規則と標準test timeoutは変えていない。
追加/変更4ファイル18件の診断実行は成功（CLI timeout/hookTimeout各30秒、maxWorkers=1）。この結果は標準Runner成功とは区別する。既存testを含む初回や直列実行の失敗ログもGit対象外reportsに保持した。
最終標準Runner（stage3-validation-ready.json）はfailed。format/typecheckは成功、testsは240秒のRunner上限でtimeoutし、後続build/secretsはskip。実行前後fingerprintは一致した。直前のRunnerでは197/198成功で、残りは5秒制限のtimeoutだった。assertion違反をtimeoutへ読み替えていない。個別のsecrets検査は成功。個別buildはAPI成功、Webは最適化段階で7分以上進行せず、今回のログを開いている所有プロセスを確認して停止した。Web buildは未完了であり成功扱いにしない。
自己レビューはSecurity/Data/Tests/Docs and commentsの4観点で、承認計画の責務表・受け入れ条件・旧実装削除を照合した。Requestのversion寿命、保存契約、HMACの用途/比較、取得Promiseの無効化、ログの固定fieldと実装の一致を確認した。全体UI分割は計画通り後続へ残した。
独立AIレビューで同一500の重複error記録が低重要度で指摘され、応答後の一箇所へ統一してerror1件の試験を追加した。修正確認とno-store/JWT試験補強の追加確認後は「指摘なし」。人間の最終差分受け入れとは区別する。
coverage率は未計測。新規sessionでのルール読込や承認前停止の運用試験は行っていない。仮の業務調整値はない。

## 残る範囲

共有DB適用、既存破損データ修復、永続監査台帳、画面表示時点からの鮮度検出、password更新の競合、一覧/集計/全体UI分割は対象外として全体改善計画とこの記録へ残す。内部保存versionでは古い画面自体は検出できない。新しい業務ルールや文字数上限は追加していない。
既存DBへの列追加は運用者の別承認が必要。コードのrollbackはcommit revertと前進修正を基本とし、列DROPや旧JWTの再許可を自動で行わない。
状態: Blocked（標準の全体検証がホスト高負荷下で未通過）。実装・DB/ブラウザ確認・独立レビューは実施済み。人間レビューと、負荷が落ちた環境での標準Runner再実行が必要。通常PRはこの状態を明記して作成する。
