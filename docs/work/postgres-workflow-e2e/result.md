# PostgreSQLを含むローカル承認フロー試験

## 計画と対象

2026年11月20日の、公開に向けてローカルE2E試験も進める依頼に基づく。
前回のPR #24を起点に `codex/postgres-workflow-e2e` で実装する。
既存のHTTPとPrisma repositoryを、試験専用の使い捨てPostgreSQLへ接続する。
架空ユーザーの作成を既存fixtureと共有し、Webから作成・提出・差し戻し・再提出・承認を確認する。
業務ルールを変更する仕様書は追加しない。

DBはComposeプロジェクト `miniflow-browser-e2e` の専用コンテナに作る。
接続先は `127.0.0.1:55439/miniflow_browser_test`、ユーザーは `miniflow_browser_test` に固定する。
初期化は空DBへの既存migration 9件の適用と架空ユーザー4件の投入。
DB停止中は試験のみ停止する。データ領域はtmpfsで、コンテナの停止・再作成時に消える。
復旧は同じ手順での初期化と再試験による。
既存の開発DBとは別のポート・DB名・保存領域を使う。

## 再現手順

リポジトリの依存とPrisma ClientをREADMEの手順で用意し、ルートから実行する。

```sh
docker compose -p miniflow-browser-e2e -f tests/integration/browser.compose.yml up -d --wait
DATABASE_URL=postgresql://miniflow_browser_test@127.0.0.1:55439/miniflow_browser_test pnpm --filter @miniflow/api exec prisma migrate deploy
pnpm test:browser:postgres
```

別ターミナルでWebを起動する。

```sh
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:43131 pnpm --filter @miniflow/web exec next dev --hostname 127.0.0.1 --port 43130
```

`http://127.0.0.1:43130/` を開く。架空アカウントと試験内容は[前回の試験](../local-workflow-e2e/result.md)のB1〜B5を使う。
DBの内容は、APIだけを停止・再起動した場合には保持される。
試験後はAPIとWebをCtrl+Cで停止し、専用DBを終了する。

```sh
docker compose -p miniflow-browser-e2e -f tests/integration/browser.compose.yml down
```

## 確認項目

| ID | 確認 | 結果 |
| --- | --- | --- |
| P1 | 空DBに既存migrationをすべて適用できる。 | 成功 |
| P2 | Webから申請を提出・差し戻し・修正・再提出・承認できる。 | 成功 |
| P3 | SQLで承認済み状態、保存version、同じ承認者の2件の履歴を確認できる。 | 成功 |
| P4 | API再起動後もWebで承認済み状態と履歴を取得できる。 | 成功 |
| P5 | 別チームの一覧が0件になる。 | 成功 |

## 検証の穴と残課題

ブラウザ試験は手動で実施する。CIへのブラウザ・実DB試験登録、lint、既知脆弱性監査は未整備。
公開先のHTTPS、CookieのSecure属性、CORS、バックアップと復元の確認は残る。
次は公開用の構成を決め、プレビュー環境で同じ試験を行う。

## 実施結果

2026年11月20日（日本時間）、CodexがChromeを操作した。
P1は9件すべてのmigration適用が成功した。
P2は「PostgreSQL E2E 備品購入」の作成・提出から差し戻し・本文修正・再提出・同一承認者による承認を実施した。
P3ではSQLで status=Approved、version=7、履歴2件、判断者1人を確認した。
P4ではAPIだけを終了して再起動し、ページ再読み込み後にも認証が復帰して一覧・詳細から同じ状態と履歴2件を取得できた。
P5は別チームの一覧が0件となり、ログアウト後にログイン画面へ戻った。
ブラウザのerror・warnログは0件。画面キャプチャを作業時に保存した。

## 試験中の修正

初期ユーザーの作成を共通化した段階で、メモリ保存先の書込みカウンターに初期4件が含まれ、既存の未保存確認16件が失敗した。
fixtureの初期化完了時にカウンターを0へ戻し、従来どおり試験対象の操作だけを数えるよう修正した。

## 自動検証とレビュー

修正後に `pnpm typecheck`、`pnpm test`（30ファイル・363件）、`pnpm build` が成功した。
テキスト形式・秘密情報検査、`git diff --check` も通過した。
初期ユーザー投入中に起動が失敗した場合は、APIを停止して上記の専用Composeをdownし、DB作成とmigration適用から再開する。
既存のメモリ保存先での試験と同じ目的のPR #24へ追加し、差分をまとめてレビューする。

独立AIレビューは指摘なし。固定接続先、DBの寿命、終了時の接続解放、初期投入失敗時の復旧手順、既存fixtureの書込みカウンターを照合した。
ブラウザとDBの操作の独立再実施は含めていない。人間のレビューは未完了。
