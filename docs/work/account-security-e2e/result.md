# 本人設定とパスワード変更のE2E結果

公開前の認証確認として、本人設定とパスワード変更を実ブラウザから検証するシナリオを追加した。製品の挙動・API・依存・CIの変更はない。人間による画面の受け入れは未確認。

2026-11-24、fetch済みmain `867cba8`を基点に実施。未マージPRなし。既存ホームページの未コミット変更は別worktreeで保護した。

## 環境と再実行

前回の[本番コンテナE2E手順](../container-workflow-e2e/result.md)を再利用した。本番API image、PostgreSQL16、本番build Web、固定localhost HTTPS、Playwright 1.65.1とChrome 157.0.8103.80の隔離contextを使用する。既存の.envや実ユーザーを使わず、自己署名証明書の例外はこのcontextだけ。外部Originへの通信は拒否する。

元のDB公開port 55449は別projectが使用していた。既存コンテナには触れず、専用Composeのコピーだけを55450へ変更した。Compose v2.15.1で最初のoverrideはportを置き換えず追加したため、最初の起動は競合で停止した。次のcopy方式で解消した。

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('tests/integration/container.compose.yml')
Path('tests/integration/account.compose.local.yml').write_text(p.read_text().replace('127.0.0.1:55449:5432', '127.0.0.1:55450:5432'))
p = Path('tests/support/containerSeed.ts')
Path('tests/support/accountSeed.local.ts').write_text(p.read_text().replace('127.0.0.1:55449', '127.0.0.1:55450'))
PY
docker compose -p miniflow-container-e2e -f tests/integration/account.compose.local.yml up -d --build
DATABASE_URL=postgresql://miniflow_container_test@127.0.0.1:55450/miniflow_container_test pnpm --filter @miniflow/api exec prisma migrate deploy
pnpm exec vite-node tests/support/accountSeed.local.ts
```

既存9件のmigrationを空の専用DBへ適用し、架空4ユーザーをseedした。WebとHTTPS proxyの起動方法は前回と同じ。driverが再起動するのは同じprojectのAPIだけで、DBの公開portは変更しない。

```sh
node tests/e2e/containerWorkflow.mjs /private/tmp/miniflow-e2e-tools /private/tmp/miniflow-account-results
```

停止時はWebとproxyを終了し、専用Composeだけをdownする。一時copyも削除する。

```sh
docker compose -p miniflow-container-e2e -f tests/integration/account.compose.local.yml down
python3 - <<'PY2'
from pathlib import Path
for name in ['tests/integration/account.compose.local.yml', 'tests/support/accountSeed.local.ts']:
  Path(name).unlink()
PY2
```

## 途中で止まった確認と修正

最初はログイン後の画面判定が失敗した。画面は「ログイン中」で、APIログはlogin 200を返していた。隔離した診断でlogin 200、CSRF 200、本文完了後のダッシュボード表示を確認した。Webのlogin処理はCSRF取得まで待ってから本人情報を反映する。試験も両APIの成功とCSRF応答本文の完了を待ち、通信中を描画失敗として判定しないよう修正した。HTTP完了を待つだけでも、5秒の判定期限直後にダッシュボードが表示されるケースが残った。同時に別projectの複数buildが動いていることも確認した。ローカルE2Eの描画待ち上限を5秒から15秒へ明示し、HTTP成功・拒否status・未知エラーの検査は維持した。自動retryは加えていない。製品コードは変更していない。

## 最終結果

既存14項目と追加7項目、計21項目が成功した。[実行JSON](evidence.json)と[機能試験FT12〜FT16](../../tests/functional/container-workflow-e2e.md)を照合した。

| 確認 | 結果 |
| --- | --- |
| 表示名・英語の保存と再読込 | 英語の画面・保存値を保持 |
| 現在パスワードの不一致 | POST 400、両セッションを維持 |
| 正しいパスワード変更 | POST 200、操作側の認証/CSRF Cookieを削除 |
| 別ブラウザの既存セッション | auth/me 401、ログイン画面へ戻る |
| 旧/新パスワードでログイン | 旧400、新200、英語のダッシュボードへ復帰 |
| 日本語へ戻す | PATCH 200、表示名を保持 |
| SQL照合 | 表示名「E2E 本人設定」、language=ja、sessionVersion=1 |

HTTPエラーは匿名起動・無効化・セッション失効の401が9件、CSRF/認可の403が4件、無効化/本人確認/旧パスワード拒否の400が3件。すべて対象を限定した意図した拒否である。対応するconsole errorは16件、未知のHTTP/console errorとpage errorは0件。APIのlevel 50/60ログは0件。

SQLではusers 5、申請Approved・version 7、判断履歴2件・同じ承認者1人も確認した。request IDは`154fbf09-b0fc-4e1d-b0c1-75fd7da3b0f7`。パスワードhash・Cookie・tokenは出力していない。

最終実行は空DBへのseed後、ログイン段階で止まった試験を修正して再実行した。失敗した試験では申請やユーザーの作成・パスワード更新は行われていない。試験後は全ブラウザ、Web、proxyを停止し、専用ComposeのAPI/DB/networkと一時設定copyを削除した。別projectのコンテナには変更を加えていない。

## 全体検証とレビュー

設定検証と実行計画を確認後、`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`が成功した。format・型検査・31ファイル392テスト・本番build・秘密情報の限定検査が成功。lintは既存Profileで未整備のためskip。両E2E moduleの`node --check`と`git diff --check`も成功。標準テストとローカルE2Eは別で、合算しない。独立AIレビューの結果は追記する。

## 残課題

公開先のTLS/DNS、共有デモの書き込み制限とデータ初期化、CIでの自動E2E、複数ブラウザ、英語の全画面は対象外。次は公開環境の構成・デモ運用条件を決める。今回の新規PRはマージせず、人間がレビューできる状態に残す。

自己レビューではsecurity/data/tests/docs-commentsを照合した。計画の図の変更成功・別セッション拒否・新パスワード再ログインはFT14/FT15、禁止する本人確認失敗はFT13で実行した。`runAccountSecurity`の役割は本人設定の画面操作に限定し、入口の認証・ブラウザ寿命・失敗集計を再利用する。追加の失敗許容は操作中フラグ・session・path・method・statusを限定し、未知エラー拒否と件数検査を維持した。旧実装の置換や未使用ファイルなし。仮の試験描画待ちは5秒から15秒へ変更した。製品の性能目標やセキュリティ設定は変更していない。新たな業務仕様や画面設計図は対象外。状態はHumanReview待ち。
