# 申請を状態で絞り込めるようにする

申請一覧と自分の申請に状態の選択欄を追加した。下書き・承認待ち・承認済み・差し戻しを選べる。
選択すると先頭ページから再取得し、詳細から戻っても一覧ごとの条件を保つ。
実機・他ブラウザ・200%拡大の見た目は未確認。

## 実装

`requestStatusFilter`が固定4状態と解除を検証し、未知値・Deletedは拒否する。文言は既存のstatusLabelsを再利用した。`requestApi`は既存のstatus queryを送り、`requestCollection`は初回・空ページ補正の両方に同じ条件を渡す。集計には条件を送らない。

`useRequestCollection`が一覧別の条件をログイン中の本人・team・role内で保持する。条件をcontextへ含め、変更直後からpage1と別の取得世代へ切り替える。画面移動は条件を保持し、既存のclearSessionと本人context更新のresetで破棄する。localeはidentityに含めない。旧成功・失敗は本番の取得処理とhookの両方で現在性を照合する。

`RequestList`は条件・一覧・エラー・再試行を表示する。取得中や失敗でデータがなくても選択欄を残し、失敗を0件にしない。詳細からの戻り先は自分の申請を区別し、新規作成からの戻り先は従来どおり申請一覧とする。CSSは既存tokenを使い、native selectを追加した。仮の新しい数値・色はない。全画面の分割は今回の目的と異なるため計画どおり行っていない。

## 検証

基点`c4ead17`からの最終コード差分を隔離コピーへ反映し、`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`でformat・型検査・23ファイル245テスト・API/Web本番build・secretsが成功した。追加6ケースと既存ページ試験5ケースを含む。lintは既存未整備でskipped。coverage設定がなく数値比較は未実施。ログは`.harness/reports/status-filter-validation.log`。

本番HTTP＋架空メモリ保存先の実ブラウザ試験は`docs/tests/functional/request-status-filter.md`に手順と結果を記録した。SF1〜SF4とSF5の画面幅・キーボードを確認。遅延成功/失敗・503再試行・401・logout・本人team変更も通った。console error/warnは0件。広い画面と390px幅の画像を保存して目視した。実DB・実機・他ブラウザ・200%拡大、role変更単独のブラウザ再現は未実施。保存・認可APIを変更しないためDB試験は適用外。既存の手動プレビューは変更していない。

## レビューと承認

自己レビューはSecurity・Data・Tests・Docs and commentsの観点でSF1〜SF5を照合した。外部入力は固定選択肢の検証、HTTPは既存の認証/チーム境界を維持する。図の選択→page1/世代→API→現在性照合→表示に、選択変換・query/補正・旧応答の試験とFF1/2/6が対応する。責務と状態の所有者・冒頭/公開契約をソースと照合した。辞書・状態名の重複定義は作らず、旧RequestListは置換した。親画面が通信の責務を新たに抱えないことも確認した。React品質の観点では共有状態を追加せず、hook順序・native操作と既存focusを維持した。

別文脈の独立AIレビューは機能コードに指摘なし。地図・単体仕様・機能結果を含む最終文書も再確認し、指摘なし。試験用API/Webは終了済み。人間は平易な操作説明の後に「よいです」で仕様・実装を承認し、通常PR作成・監視・問題がなければマージする操作も事前承認した。AIレビューを人間の受け入れとは扱わない。新規sessionのルール読込等の運用遵守をテスト成功から推定しない。

公開API・認可・DB schema・migration・依存・CI・Harness設定の変更なし。Webクライアントは既存queryを使用する。範囲外で新しく見つけたことなし。最終状態はPRレビュー後に報告する。
