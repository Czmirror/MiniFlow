# Unit test spec: 本人更新の影響判定

- 対象: `apps/web/src/lib/managedUserChange.ts`。通信・画面状態を持たない判定関数を本番からimportする。
- 実施者・日付: Codex、2026-10-27。

| ID | 条件 | 対応test | 結果 |
| --- | --- | --- | --- |
| UT1 | 本人の表示名・言語だけはprofile | `ManagedUserChange.spec.ts`: 本人の表示名・言語だけなら入力を維持する | 成功 |
| UT2 | 本人のteam変更、role変更、両方変更はcontext | 同spec: 本人の所属・role変更は入力を破棄する、3ケース | 成功 |
| UT3 | 他人のteam・role変更はother | 同spec: 他人の所属やrole変更は本人情報を変更しない | 成功 |

追加の詳細応答試験は`CurrentRequestDetail.spec.ts`で本番の`currentRequestDetail`をimportする。待機中の世代変更による成功破棄、認証破棄後の失敗破棄、現在の成功・失敗の伝達の3ケースが成功した。

更新中のセッション世代や実フォームのresetはこの純粋関数の担当外で、FT1〜FT4の実ブラウザ試験で確認する。既存のHTTPチーム境界・認証試験も維持する。
