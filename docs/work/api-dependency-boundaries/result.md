# API内部の依存方向の整理

認証と申請の利用者向け動作を維持して、業務処理から暗号実装とHTTPへの依存を外した。
パスワード操作を引数で渡し、暗号処理に失敗した場合の未保存を確認できるようにした。
実DBへの変更や新たな運用操作はない。

## 実装と契約

`StateConflictError`を`domain/errors/`へ移した。旧applicationの定義は削除し、すべての現行importを更新した。domainからHTTPの`statusCode`を外し、既存のauth/request routeで409へ変換する。例外名・message・JSONのcode/statusは維持する。

`PasswordOperations`はhash作成と照合の非同期契約だけを持つ。loginには照合だけ、ユーザー作成にはhashだけ、変更には両方を受け取る型を使う。usecaseはbcryptをimportせず、実装の既定値も持たない。HTTPの`createHttpServer`とCLIの`runAdminCommand`が既存bcrypt実装を明示的に渡す。ラウンド数10、入力条件、保存とsessionVersion更新、cookieと認可は変更しない。既存のhash/verify関数はHTTP fixture等の利用があるため残し、注入用objectは同じ関数を参照する。二重の暗号実装は作っていない。

## 検証記録

基点は`18ec68e`。Codexが2026-10-27に今回のコード差分を隔離コピーへ反映し、テレメトリを無効にしてHarness Runnerを実行した。追加試験は`docs/tests/unit/api-dependency-boundaries.md`の15ケース。

初回Runnerはdomainの既存試験23件がHTTP statusCodeを直接期待して失敗した。この改修ではHTTP属性を外す計画のため、同じ禁止遷移23件の試験を維持し、競合例外型・正確な理由・元状態の保持を確認する形へ変更した。409と本文は新規の本番HTTP試験で確認する。試験の削除やskip化は行っていない。初回ログはGit対象外の`.harness/reports/boundaries-validation-first.log`。

`node .harness/upstream/scripts/validate.mjs --execute`の再実行はformat・型検査・22ファイル239テスト・API/Web本番build・secretsが成功した。既存の本物bcryptによるHTTP/CLI試験も含む。別文脈の独立AIレビューもB1〜B4、単一定義、依存方向、失敗伝達、既存23ケースの維持と文書整合を確認し、指摘なし。最終文書のformat・secrets・diff検査も成功した。ログは`.harness/reports/boundaries-validation.log`。

## 検証境界と自己レビュー

B1はdomainの上位依存がなく、旧例外定義への参照がないことを検索した。禁止遷移はdomain試験、条件付き保存は既存repository試験、HTTP 409の型・本文は`ConflictResponses.spec.ts`で照合する。B2の暗号呼び出しは本番usecaseへfakeを渡し、成功・存在なし・無効・重複・不一致・照合障害・hash障害・入力不正を検証する。B3は既存の本番HTTP＋メモリ保存先試験で実際のbcryptを使い、CLIもメモリ保存先で呼ぶ。実DBへ接続しない。

Security・Data・Tests・Docs and commentsの観点で、入力検証→本人/重複確認→照合/hash→必要時のみ保存の順序を計画の図と照合した。domain例外はHTTPを知らず、applicationの契約には実装・I/Oを置かない。CLIとHTTPの既存の組立から実装を渡す。秘密の入力は本番ログへ追加せず、試験値は架空。公開シンボルの役割と失敗契約をコード側へ記載し、地図も更新した。

既存の認可・cookie・CSRF防御は変更していない。UIの見た目とブラウザ挙動は変更しないため、新しいブラウザ検証は今回の対象外。実DBのtransaction試験は保存契約に変更がないため未再実施で、既存の明示起動試験はimport更新のみ。lintは既存未整備でskipped。coverage測定設定がなく数値比較は未実施。新規sessionでのルール遵守などの運用を、テスト成功から推定していない。

API・DB schema・migration・依存・CI・Harness設定の変更なし。仮の調整値なし。範囲外で新たに見つけたことなし。人間の計画承認は提示後の「よいです」。通常PR作成・監視・問題がない場合のマージも今回の会話で明示承認済み。AIの独立レビューを人間の承認と扱わない。
