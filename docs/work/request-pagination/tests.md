# Test drafts: 申請一覧と全件集計

承認後、既存の`docs/tests/functional/`と`docs/tests/unit/`に正本を作り、ここは承認経緯として残す。対象は`spec.md`。

## 機能試験

| ID | 条件 | 操作と期待結果 | 結果 |
| --- | --- | --- | --- |
| FT1 | AC1 | 45件以上で1〜3ページを移動。件数・順番・最終ページの項目が正しい | 未実施 |
| FT2 | AC2 | 他人・他teamを混ぜ、3役割で自分の申請と承認待ちを確認。先頭20件に対象がなくても取得できる | 未実施 |
| FT3 | AC3 | 状態別の45件以上から指標を確認。削除済みを除外し、待ち表が5件以下で正しい | 未実施 |
| FT4 | AC4 | 最終ページ更新、一覧切替、通信失敗と再読み込み、遅い応答中の画面/認証変更で古い結果が復帰しない | 未実施 |
| FT5 | AC5 | 認証なし、他team、未知scope、境界外page、scope/status矛盾をHTTPで検査 | 未実施 |
| FT6 | AC6 | 390/1280 pxで前後ページと再取得をキーボード操作。操作が見えてフォーカスを識別できる | 未実施 |

## 単体・契約試験

| ID | 対象 | 観点 | 結果 |
| --- | --- | --- | --- |
| UT1 | 一覧usecase・保存先・HTTP | scope既定、本人条件、Applicant、他team、Pending、既存filterとのAND、0件、20/21/40/41件、同時刻の安定順 | 未実施 |
| UT2 | summary | 各状態、本人、別team、Deleted、0件、全件カウントと1回の集計の整合 | 未実施 |
| UT3 | Web取得状態 | 画面/page変更、0件、最終page補正、成功/失敗/再取得、旧応答、認証reset、重複操作 | 未実施 |
| UT4 | schema/usecase | 未指定・空・null・型違い・未知scope、page/limit最小最大と範囲外、offset上限、矛盾するfilter | 未実施 |

実施後は対応テスト名・環境・実施者・日時・証拠を正本に記録する。AIによる確認と人間の受け入れは分ける。実DBは`plan.md`で限定した一時DBのみ。既存の手動確認DBは使用しない。

正本と実施結果は`docs/tests/functional/request-pagination.md`と`docs/tests/unit/request-pagination.md`へ反映した。このファイルの表は承認前に提示した草案の記録で、最終結果を示さない。
