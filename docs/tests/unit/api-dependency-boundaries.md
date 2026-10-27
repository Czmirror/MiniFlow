# API依存境界の単体・HTTP回帰試験仕様

計画は`docs/work/api-dependency-boundaries/plan.md`。本番usecaseに暗号操作を渡し、保存と失敗の順序を確認する。入力・認可・HTTP応答の正本は`docs/API.md`を維持する。実データ・実DBを使わない。

| ID | 条件・期待値 | 対応テスト | 結果 |
| --- | --- | --- | --- |
| BU1 / B2 | loginは有効ユーザーの保存hashを照合し、保存しない | `PasswordDependencies.spec.ts`: loginは保存済みhashを照合し、有効な本人を返すだけで保存しない | 成功 |
| BU2 / B2 | 存在なし・無効ユーザーを暗号処理前に拒否 | 同spec: loginのmissing/disabledユーザーは暗号処理前に拒否する、2ケース | 成功 |
| BU3 / B2 | 不一致は拒否、照合障害は伝達し未保存 | 同spec: loginの不一致は拒否し、照合障害は元の例外を伝える | 成功 |
| BU4 / B2 | 新規hashを作り保存する。平文は保存しない | 同spec: 新規作成は注入されたhashだけを保存し、平文を保存しない | 成功 |
| BU5 / B1/B2 | 重複emailはhashを作らず競合で未保存 | 同spec: 重複emailではhashを作らず、既存ユーザーを上書きしない | 成功 |
| BU6 / B2 | hash作成障害では作成しない | 同spec: 新規hash作成の障害ではユーザーを作らず、元の例外を伝える | 成功 |
| BU7 / B2 | 変更は照合→hash→保存で認証世代を更新 | 同spec: 変更は現在passwordの照合後にhashを作り、認証世代と同時に更新する | 成功 |
| BU8 / B2 | 対象なしは暗号操作なしでnull | 同spec: 変更対象が存在しなければ暗号操作せずnullを返す | 成功 |
| BU9 / B2 | 現在password不一致はhash作成前に拒否 | 同spec: 現在passwordが不一致なら新hashを作らず未保存 | 成功 |
| BU10 / B2 | 照合・hash障害は保存と失効を行わない | 同spec: 変更のverify/hash障害では保存と認証世代更新を行わない、2ケース | 成功 |
| BU11 / B2 | 入力不正は暗号操作・保存前に拒否 | 同spec: 入力不正は暗号操作と保存の前に拒否する | 成功 |
| BH1 / B1 | 重複ユーザー作成の409本文と未保存 | `ConflictResponses.spec.ts`: 既存emailのユーザー作成は従来の409本文で未保存 | 成功 |
| BH2 / B1 | 提出済み申請の再提出は409で状態維持 | 同spec: 提出済み申請の再提出は従来の409本文で状態を維持 | 成功 |

追加15ケースはCodexが2026-10-27に実施し成功。B3は既存`AuthInputs.spec.ts`の本物のbcryptによる変更後の旧password拒否・新password許可・全token失効、`TeamBoundaryRoutes.spec.ts`の管理者ユーザー作成、`AdminCommand.spec.ts`の新規Adminと重複拒否を実行する。これらの最終結果は作業結果へ記録する。HTTPはFastifyの実routeとメモリ保存先を接続し、DB transactionの保証とは区別する。
