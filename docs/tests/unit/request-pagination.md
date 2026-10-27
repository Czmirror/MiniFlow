# Unit test spec: 一覧・集計・Web読込

- 対象仕様: `docs/API.md`。
- 実行: Codex、2026-10-27。通常のVitestに加え、明示起動専用の実PostgreSQL試験を実施した。

| ID | 対象・観点 | 対応するtest | 結果 |
| --- | --- | --- | --- |
| UT1 | 用途、本人、team、削除済み、ページ取得前の絞り込み | `RequestPagination.spec.ts`: 本人と承認待ち、全ページ取得 | 成功 |
| UT1-DB | 0/20/21/40/41件、同時刻のID降順、全ページの重複・欠落、別本人の空結果 | `requestPagination.integration.ts`: 各boundaryケース。専用DBだけを許可するguard付き | 成功 |
| UT2 | 全件集計、本人、別team、削除済み、0件 | HTTPの全件集計、DBの60件全状態とboundary 0〜41件 | 成功 |
| UT3 | 最終ページの一度だけの補正、0件、再減少時の再取得案内、失敗と無効応答 | `RequestCollection.spec.ts`の5件 | 成功 |
| UT3-hook | hook本体の世代更新・reset・再取得 | hookを直接マウントする単体試験はない。3秒遅延を用いた画面切替・ログアウト/別本人ログイン・503/回復を実ブラウザで代替確認 | 単体は未実施。ブラウザ代替確認は成功 |
| UT4 | 既定scope、不正scope、空、page境界、limit最大外、scope/status矛盾、認証とsummary query | 新規HTTP試験と既存`AuthInputs.spec.ts`・`RequestUseCases.spec.ts` | 成功 |

入力値の詳細はtestコードを正本とする。実DB試験は通常`pnpm test`からは起動しない。正常な最小最大・offset上限等の既存テストを維持している。新規のscope=null/型違いのHTTP構造はschemaで拒否するが、queryにJSON nullを表現する別の入力形式は追加していない。
