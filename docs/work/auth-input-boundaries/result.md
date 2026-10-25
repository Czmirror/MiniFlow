# 第2段階の実施記録

2026-10-26。基点 `f51f287c96e9c7a3aed041b9fb1b4b310249b5c0`、branch `codex/auth-input-boundaries`。
ユーザーの仕様確認後の「進めて」によりローカルCLI・8時間・全失効の仕様を承認。その後「通常PRまで作成する」の回答によりpush/通常PR作成も承認された。

## 実装

- 公開POST /auth/register、clientのregister APIと未参照AuthPanelを削除。Adminの/usersを正規入口に統一。
- JWT鍵を必須化し、署名・8時間期限・sessionVersion・現在のユーザー状態を照合。password hash更新と世代incrementは同一Prisma update。cookie寿命も一致。
- sessionVersionのschema/migrationファイルを追加しPrisma Clientを生成。実DBへの適用、実アカウント作成、既存秘密の読取は行っていない。
- profileの未指定/null・列挙値・型違い、申請の型/UUID/空白/queryを実行時検証。HTTPは既存Fastify/Ajvを使い、新しい依存は追加していない。
- Host/Originを検査し、直起動はloopback、DockerのみHOSTを明示。JWT/DB障害の生値をerror responseや新しいログへ出さない。
- HTTPの組立をcreateHttpServerへ分け、テストは保存先だけをfakeに置き換える。productionのDB生成/切断は既存serverの責務。
- ローカルAdmin CLIは環境から入力し、既存emailの昇格/上書きなし、出力にemail/passwordや生の例外を含めない。PrismaのCLI用loggerも無効化。
- password変更後のWebはcookie/CSRFキャッシュ・認証状態を破棄し、再ログインを案内する。
- API文書・OpenAPI・共有型・生成型を更新。openapi-typescriptは既存ローカル7.13.0で再生成し、追加installしていない。

## 検証

- `pnpm typecheck`: workspaceとrootを含め成功。
- `pnpm test`: 11ファイル180件成功。既存のHTTP/CORS文字列テストを本番HTTPの実リクエストへ置換し、期限なしJWT、期限切れ、世代不一致、全token失効、Admin/role/team、未指定/null/型違いを検証。
- 実ブラウザ: メモリ保存先のfixture API（43101）とNext.js（43100）で架空ユーザーのlogin→profile更新→logout成功。同hostの別port（43102）からform送信を行い、実際のFORBIDDEN/status403を確認。
- ブラウザ証拠: Git管理外 `.harness/reports/account-browser.png`、`origin-rejected.png`。成功画面の値は架空データのみ。
- fixtureの一時serverは停止した。ブラウザpassword変更フォームはcredential変更のユーザー引継ぎ規則により自動送信していない。APIのpassword変更・全失効はHTTPで成功。機能試験FT9のブラウザ操作は未実施として記録。
- 初回の一時server起動はsandboxのlisten制限、テストmoduleのCJS/ESM import不一致で失敗。fixtureのimportを修正しloopback起動の権限内で再実行後、上記ブラウザ試験に成功。
- 全体Runnerはformat・型検査・180件のtest・build・secretsが成功し、実行前後のfingerprintは一致。lintは既存コマンド未整備により設定通りskip。独立レビュー後のoffset修正を含め全体Runnerを再実行し、同じ検証がすべて成功した（stage-2-validation-final.json）。

## 未実施・残る範囲

migrationの実DB適用/lock時間/rollback、DBでの永続化、CLIの実アカウント作成、ブラウザのpassword変更操作は未実施。
OpenAPI型生成toolの直接依存宣言は未整備で、クリーン環境の再生成は未確認。今回のアプリ型検査と生成物の更新とは区別し、依存追加は別の作業として残す。
申請保存の競合、CSRF token方式と複数タブの取得競合、全体UI分割・一覧集計は次段階。全体レビューのすべてを解消したとは扱わない。
coverage率は未計測。APIの認可・失敗境界は本番importと実HTTPで検証し、件数だけを成功の根拠にしない。

## 受け入れ条件の対応

AC1〜AC9の結果と対応testはdocs/tests/functional・unit/auth-input-boundaries.mdへ記録。AC4のHTTP失効部分は成功、ブラウザのフォーム送信は未実施。AC9の生成toolのクリーン再現性は残課題。
新しい長さ上限・password強度・Unicode制限・Adminの管理範囲・申請遷移の変更は行っていない。schemaの実DB適用とコード生成、fixture試験と実DB試験を分離した。

## 最終差分レビュー

自己レビューはSecurity/Data/Tests/Docs and commentsの4観点で実施した。HTTP構築・認証・profile検証・CLIの責務を計画と照合し、旧registerと未参照UIを削除した。DTOにpassword hashや認証世代を露出せず、migrationは列追加だけで既存データを変更しない。仕様AC1〜AC9、試験仕様と未実施範囲は上記のとおり。Harness/CIの基準は変更していない。
独立AIレビューで、page単体が安全整数でも計算後のoffsetが精度を失う組合せの指摘があった。usecaseでoffsetの安全整数検証を追加し、本番HTTPで巨大pageとlimitの組合せを拒否する回帰ケースとAPI契約を更新した。reviewerは修正を確認し、最終報告は「指摘なし」（未解決指摘なし）。
実DBでのskip型上限は未確認であり、根拠のない上限は追加していない。
人間は計画と重要仕様・通常PR作成を承認済み。最終差分の人間レビューと未実施の実動検証は未確認で、PRはHumanReview待ちとする。

## PR #5の401復帰修正（2026-10-26）

レビューコメント `discussion_r4371540836` を確認した。期限切れの401をWebが通常エラーとして処理し、ログアウト要求も401になると認証stateが残る不具合は妥当だった。
`apiTransport.ts`へHTTP応答処理とCSRF保持を集約した。401は本文の解析失敗にもかかわらずCSRFを破棄し、HTTP status付きの `ApiError` として画面へ渡す。MiniFlowAppは各操作のcatchで401だけを判定し、ユーザー・一覧・詳細・管理者入力・password入力を消してログインへ戻す。403と通信失敗は認証失効として扱わない。成功したlogout/password変更も同じ画面初期化へ委ねる。

`SessionExpiry.spec.ts`の9件と型検査が成功。架空のメモリAPI43101とNext.js43100を使い、API側で認証世代を増やしたあと、実ブラウザのアカウント保存が401→ログイン画面→再ログイン200へ戻ることを確認した。再度失効させ、Logoutの401でも同じ復帰を確認した。再ログイン後のアカウント保存は200で、新しいCSRFを使った更新も成功。証拠はGit対象外の `session-expired-login.png` と `session-relogin-saved.png`。
8時間の実時間待ちは行わず、同じ401を返す認証世代不一致で確認した。JWTの期限切れ判定自体は既存HTTPテストで確認済み。実DB・本物の秘密を使わず、ブラウザのpassword変更は今回も操作していない。
仮APIの標準入力が最初の起動では閉じていたため、そのプロセスだけを停止して対話可能な形で再起動した。初回ページ表示のコンパイル待ちによるナビゲーションtimeout後は、表示済みタブを再取得して検証を完了した。検証用サーバーとタブは停止・閉鎖済み。

今回の差分に対する全体Runnerは、format・型検査・189件のtest・build・secretsが成功し、実行前後のfingerprintが一致した（Git対象外 `pr5-session-validation.json`）。lintは既存未整備のためskip。Runner後の変更は末尾空行の除去とこの結果記録のみで、テキスト検査とdiff checkを再実行した。
自己レビューではSecurity/Data/Tests/Docs and commentsを照合した。共通HTTP処理の正本はapiTransportに1つだけで、旧parser/cacheは削除済み。画面のstate初期化はMiniFlowAppのclearSessionに集約し、既存の各catchから委譲する。全体UI分割には拡大していない。独立AIレビューはこの修正差分について「指摘なし」。追加の未解決指摘はない。新しいAPI・DB・依存変更なし。仕様は承認済み再ログインフローのバグ修正のため追加仕様書を作らず、計画・試験・実施記録を更新した。人間の最終レビューは未実施（HumanReview待ち）。
