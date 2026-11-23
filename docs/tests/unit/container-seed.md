# コンテナE2Eのseed安全条件

対象は`tests/support/containerSeed.ts`。本番機能ではなく、固定の専用DBを初期化する試験入口である。mockによる実装の複製は追加せず、実DBで分岐を確認した。

| ケース | 条件 | 期待結果 | 対応する確認 | 結果 |
| --- | --- | --- | --- | --- |
| UT1 | migration直後の空DB | 既存fixtureの4ユーザーを作成する | containerSeed.ts実行とusers件数 | 成功 |
| UT2 | 初期化済みDB | 固定エラーで停止し、既存データを書き換えない | 再実行の拒否とusers 4・requests 1・approvals 2の照合 | 成功 |

2026-11-23、AI実施。[手順と証拠](../../work/container-workflow-e2e/result.md)を参照。接続不能時は例外となり、別DBへfallbackしない。実DBの接続障害再現は未実施。
