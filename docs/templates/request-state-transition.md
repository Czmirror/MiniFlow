# 現行APIの申請テストを追加するとき

実行可能な正本は `tests/domain/request/Request.spec.ts` と `tests/application/usecases/RequestUseCases.spec.ts`。本番の `apps/api/src` をimportし、I/Oだけを `tests/support/requests.ts` のfakeに置き換える。旧プロトタイプを対象にしたテンプレートは廃止した。

| 旧ケース | 現在の確認先と扱い |
| --- | --- |
| T01–T20 | domainの表駆動テスト。終端状態では6操作をそれぞれ拒否する |
| T21/T22 | usecaseのrole拒否と全roleの自己承認・自己差し戻し拒否。Policyのstubは使わない |
| T23 | 同一Pendingへの連続決定は終端状態保護で拒否。差し戻し→修正→再提出後は同じactorが再決定できる現行仕様を検証する |
| 旧usecaseの404 | 現行usecaseはnullを返し、404への変換はHTTP層の責務。テストもnullと未保存を確認する |

新しい遷移を追加するときは、成功結果だけでなく履歴・時刻・元のaggregateの保持と、拒否時の未保存も確認する。チーム境界、HTTP status、ブラウザ表示、実DBのtransaction/競合はこのfakeで保証できないため、それぞれ別の試験で確認する。
