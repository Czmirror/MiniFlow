# 申請のページ送りと全件集計の結果

申請一覧・自分の申請・承認待ちをページ単位で取得し、21件目以降も表示できるようにした。
ダッシュボードの件数は先頭ページから計算せず、同一チームの全件を集計する。
実際の200%拡大など前段階から残る確認は未実施のまま区別している。

## 実装・契約

- GET `/requests`に任意の`scope`を追加。省略時の既存契約は維持する。本人・role・teamは認証情報から確定する。
- GET `/requests/summary`は認証必須・queryなし。削除済み以外の6指標をPostgreSQLのRepeatableRead transactionで返す。
- Webは一覧20件、ダッシュボードの承認待ち5件。取得中は同一画面の既存表示に読込状態を示してページ・詳細操作を無効にする。別本人・別画面の古いデータは表示しない。
- 空になった最終ページは一度だけ補正する。補正中にも件数が減ってページが無効になった場合は、再取得を促して無限再試行しない。
- API通信、読込調整、hookの取得状態、画面表示を分け、旧Webのクライアント集計・絞り込みは削除した。アカウントやユーザー管理の再構成は行っていない。
- DB schema、migrationファイル、依存、CI、Harness設定の変更はない。OpenAPIから既存のopenapi-typescript 7.13.0で生成型を更新した。新規依存や外部取得はない。

## 計画の確認対象と証拠

| 項目 | 結果と証拠 |
| --- | --- |
| Security・SQL: 本人とteam | 新規HTTP試験で認証なし401と任意指定の無視を検査。実PostgreSQLでAdmin mine24・待ち6、Applicant待ち0、別teamは1件を確認 |
| Input validation | scope3値と既定、空・未知scope、page/limit、矛盾するstatus、summary queryの拒否をHTTP検査。既存入力試験も成功 |
| Design・Web: 旧応答と認証reset | hookのcontextとgenerationを照合。実ブラウザで3秒遅延した2ページ目の途中に画面を切替、旧応答後も待ち6件を維持。途中で別本人へ再ログインした場合も本人の24件・作成者だけを表示 |
| Web: 失敗と回復 | テスト用proxyでsummaryだけ503にし、0件に置換せずエラーと再読み込みを表示。回復後はApplicantの待ち0件を表示 |
| 機能: 全件とページ | 実DBの非Deleted48件が20/20/8件、全48IDに重複なし。実ブラウザでも3ページまで確認。mine24は20/4件 |
| DB: 境界と安定順 | 明示起動専用`requestPagination.integration.ts`で0/20/21/40/41件を検査。同じ作成時刻でもID降順で全ページに欠落・重複なし。各全件集計と別本人の空結果も成功 |
| UI | 390/1280 pxでページ全体の幅がviewportと一致。Enterで前後ページを操作し、実際の表示範囲の変更を確認 |

機能試験の正本は`docs/tests/functional/request-pagination.md`、単体試験は`docs/tests/unit/request-pagination.md`。hook本体を直接マウントする単体試験はなく、世代・認証resetは実ブラウザで代替確認している。最終ページの件数減少・補正は単体試験であり、実ブラウザでの再現は未実施。

## 実行環境と検証

Codexが2026-10-27に実行した。既存の手動確認環境とは別に、一時コピーと専用コンテナ`miniflow-pagination-check-20261027`を使用した。DBは`miniflow_pagination_check`、loopback port60508、tmpfs。既存migrationをこの新規DBだけに適用し、架空データだけを投入した。秘密鍵はプロセス内で生成し、表示・ファイル保存していない。

実データ経路は「画面のページ操作 → requestApi → 認証HTTP → usecase → Prisma/PostgreSQL → ページと全件集計 → hook → 画面」。通常経路はWeb43102/API43103。遅延・失敗試験だけ、WebのAPI接続先を一時コピー内でloopback proxy43104へ差し替えた。proxyは43103への転送だけを行い、cookie・本文は記録しない。製品のソースやAPIに試験用の分岐を追加していない。

- Harnessの設定検査・実行計画表示: 成功。
- 一時検証コピーでRunner: format、型検査、17ファイル214件のテスト、API/Web本番build、secretsが成功。lintは既存設定どおり未整備でskipped。
- 実DB境界試験: 0/20/21/40/41件すべて成功。初回はrootにtsxがなく実行前に失敗し、API側に既存のランタイムで再実行した。
- 最初のHTTP追加試験はテスト要求のHost port不足で403となり、正規の許可Hostを指定して修正した。
- 開発中のhook追加をFast Refreshが保持できず、一度full reloadの警告が出た。最終コードを再読み込みしてページ操作を再確認し、その後のconsole error/warnは0件。
- 証拠はGit対象外の`.harness/reports/pagination-validation.log`、`pagination-db-result.json`、`pagination-db-boundaries.log`、`pagination-desktop.png`、`pagination-mobile.png`。

最終の文書・生成型・統合試験追加後も型検査、format、secrets、diff検査が成功した。Runner実行後のアプリ本体の変更はない。一時API/Webと通信テストproxyを終了し、今回の専用コンテナが残っていないことを確認した。既存の手動確認環境は停止していない。

## レビュー

自己レビューで入力・team条件・snapshot集計・旧応答棄却・旧処理削除を確認した。新しいコメントは担当範囲、ページ補正の上限、snapshotの理由を説明している。CSSの新規寸法・色はなく既存変数を使う。転送・暗号・認証の仕組みは変更していない。

独立レビューは別文脈のAI1名で実施。機能不具合の指摘はなく、OpenAPIの認証記載、試験正本、hookの実動確認の不足が指摘された。認証宣言と試験正本を追加し、遅延・認証切替・通信失敗/回復を実ブラウザで確認した。同じ独立reviewerによる再確認は指摘なし。reviewer自身の実DB・ブラウザの再実行ではなく、差分と証拠の読み取りレビューとして記録する。

範囲外で見つけたこと: なし。前段階の200%拡大・実機・他ブラウザは未確認。大規模件数での性能保証や、別HTTP応答間の完全な時点一致は今回の対象外。

人間の承認は、計画提示後の会話「ok」。人間の見た目の受け入れは未実施。実装・検証・独立レビューは完了し、人間の受け入れ待ち。通常PR運用は会話の「pr作って進めたいです、draftprにはしないでいいです」を引き継ぐ。
