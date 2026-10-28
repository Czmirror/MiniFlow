# 一覧の続きへ戻る改善の実装・検証記録

## 概要

申請の詳細を見終わったあと、元の一覧のページから続けて確認できるようにした。
申請一覧・自分の申請・承認待ちで位置を覚え、条件変更や認証境界の変化では初期化する。
最後のページが削除でなくなった場合も、有効なページへ戻れる。
人間による画面の受け入れ確認は未実施。

## 変更内容と契約

基点は`711a411e5e04dc3257a3e4c3cda00aad9a7b8e12`。計画は同フォルダーの`plan.md`、仕様は`docs/specs/request-status-filter.md`のSF3とLP1〜LP4。削除仕様の戻り先も同じ契約に合わせた。

- `requestListSelection`は一覧別のページと条件の純粋な状態操作を担当する。React・通信・認可へ依存しない。旧filterと単一selectionを置き換え、正本を重複させない。
- `useRequestCollection`は状態の寿命と取得順を持つ。既存の最終ページ補正を使い、最新の取得だけ補正位置を記憶する。補正直後の同じ取得は1回だけ省き、次の画面復帰・再試行では再取得する。
- `MiniFlowApp`は承認待ちから開いた詳細の戻り先も承認待ちにする。選択状態の固有処理は親へ移していない。
- 認証・本人の所属・権限変更では全一覧を初期位置へ戻す。API・DB・migration・依存・認可・表示件数は変えていない。仮の調整値はない。

## 検証と受け入れ条件

設定検査と実行計画を確認してから、同じ実装差分を持つ隔離作業コピーでHarness Runnerを実行した。既存の確認サーバーへ影響させないため、buildと実動用のコピーを分けた。実行コマンドは`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`。

- 文章形式、全workspaceとrootの型検査、25ファイル276試験、API/Web本番build、secretsは成功した。追加状態試験は16件。lintは既存未整備のためskipped。
- 単体試験仕様は`docs/tests/unit/request-list-position.md`。補正・遅延は既存`RequestCollection.spec.ts`9件も継続して検証した。純粋状態試験だけでhookの実動を検証したとは扱わない。
- 機能試験仕様は`docs/tests/functional/request-list-position.md`。LF1〜LF6をCUAの実ブラウザで成功確認した。日本語・英語、通常幅・390×844px、詳細往復・一覧切替・削除による補正・0件・再試行・遅い成功と失敗・401・本人の所属と権限変更・再読込を確認した。
- LP1は3一覧の詳細往復と独立保持、LP2は条件変更・最終ページ削除・0件、LP3は401・team往復・role変更・言語変更・再読込、LP4は遅延と同ページ再試行の結果に照合した。図の各経路はLF1〜LF4に対応する。
- ローカル証拠は`.harness/reports/list-position-validation.log`、`list-position-focused.log`、`list-position-counts.json`、`list-position-return-wide.png`、`list-position-return-narrow.png`。ブラウザのerror/warningログは0件。

最初の専用サーバー起動はsandboxのbind制約で失敗した。loopbackの専用ポート起動を許可された範囲で再実行し、実動検証を完了した。初回タブは接続失敗したため、新しい専用タブで確認した。実DB・実ユーザーは操作していない。

## レビューと人間の確認

自己レビューではLP1〜LP4、入力の整数・範囲外・未知条件、補正の結果キー、取得世代、reset条件、コメントと責務を照合した。新しいmoduleの役割は選択状態だけで、hookは取得、親は戻り先の接続を担当する。既存の取得補正と条件parserを再利用し、旧filters/selectionの二重保持は残っていない。ソースの地図を更新した。分割延期や新たな範囲外の問題はない。

独立AIレビューでは最終差分・文書・Runnerログ・取得記録・広幅と狭幅の画像を照合し、指摘なしだった。security・data・tests・docs-commentsの観点を確認し、マージを止める項目はなかった。CUA操作は主担当が実施し、独立担当は再操作していない。AIレビューは人間の受け入れではない。

人間の承認は、計画提示後の「よいです。その計画で進めて、通常PRを作成し、レビューとチェックに問題がなければマージまでお願いします」。実データ操作は承認範囲に含めない。branchは既存慣習に合わせ`codex/request-list-position`とした。

未実施は人間の画面受け入れ、他ブラウザ・実機・200%拡大。実DB検証はAPI・DB変更がないため今回の対象外。新規セッションでのルール発見・承認前停止など運用全体は試験していない。残存リスクは既存のlint/CI未整備と上記の未検証環境。状態は実装・AI検証済みで、GitHubの最終headのレビューとチェックを確認してから承認済みのマージへ進む。
