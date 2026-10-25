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
