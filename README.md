# MiniFlow

MiniFlowは、チーム内の申請・承認を扱う業務システムのプロトタイプです。
申請者が下書きを作成・提出し、承認者が承認または差し戻します。管理者はユーザーと所属・役割を管理します。
TypeScriptのモノレポで、業務ルール、ユースケース、DB・HTTPの責務を分けて実装しています。

このREADMEはmainに取り込まれた機能を説明します。開発中の変更や将来案は、実装済み機能に含めません。

## 実装済みの機能

| 機能 | できること |
| --- | --- |
| 申請のライフサイクル | 下書き作成・編集・提出、承認・差し戻し、下書きへ戻して再申請、条件を満たす申請の論理削除 |
| 一覧と集計 | チームの申請、自分の申請、承認できる申請の一覧、状態フィルター、ページ送り、ダッシュボードの全件集計と一覧への移動 |
| 申請詳細 | 状態・本文・次の操作・承認履歴の表示、現在の差し戻し理由の強調、取得失敗時の再試行 |
| 編集中の保護 | 保存済み下書きの未保存変更を検知し、画面移動・ログアウト前に確認 |
| アカウント | ログイン・ログアウト、表示名・日本語/英語の設定、現在のパスワードを使ったパスワード変更 |
| ユーザー管理 | 管理者によるアカウント作成・編集・無効化、所属・役割の管理 |
| アクセス制御 | 認証情報に基づくチーム境界、申請の状態・作成者・役割による操作制限 |

申請の状態は`Draft`（下書き）、`Pending`（承認待ち）、`Approved`（承認済み）、`Rejected`（差し戻し）、`Deleted`（削除済み）です。
画面上の操作制限に加え、APIでも認可を行います。所属は管理者が管理し、一般ユーザーが自由に切り替える機能はありません。

## 認証とデータの保護

- メールアドレスとパスワードでログインし、JWTをHttpOnly cookieに保存します。パスワードはbcryptでハッシュ化します。
- 認証の有効期限は8時間です。パスワード変更では認証世代を更新し、すべての既存セッションを失効させます。ログアウトは、そのブラウザのcookieを削除する操作です。
- 更新APIはログインセッションに結び付いたCSRFトークンを検証します。HTTPのHost・Originと入力形式も検証します。
- 申請は保存時にversionを照合し、競合をHTTP 409で返します。承認・差し戻しの状態更新と履歴の追加は同じトランザクションで行います。

保存versionはサーバーが取得してから保存するまでの競合を検出します。古い画面を開き続けたこと自体を検出する仕組みではありません。
認可・状態遷移・エラー契約の詳細は[API仕様](docs/API.md)、設定と運用上の注意は[ローカル運用手順](docs/runbook.md)に記載しています。

### 提供していない機能

公開ユーザー登録とメール招待はありません。初期管理者は運用者がCLIで作成し、以降のアカウントは管理者が発行します。
**パスワードを忘れた利用者向けのメール再設定機能は未実装です。** `/account/password`は、ログイン済みの本人が現在のパスワードを入力して変更するAPIです。
通知センター、LINE連携、多段承認も対象外です。公開デモURLやGitHub ActionsによるCI実行結果は、このREADMEでは提供していません。

## 技術構成

| 領域 | 技術 |
| --- | --- |
| フロントエンド | Next.js 15、React 19、TypeScript |
| API | Fastify 5、TypeScript |
| データベース | PostgreSQL 16、Prisma 6 |
| テスト | Vitest、実HTTPとメモリ保存先を使う試験、専用PostgreSQLでの明示実行試験 |
| 開発環境 | Node.js 22.12以上、pnpm 10.6.3、Docker Compose |

```text
apps/
  web/                 Next.jsの画面とAPIクライアント
  api/
    src/domain/        申請・承認・ユーザーの業務ルール
    src/application/   ユースケースと保存先などの契約
    src/infrastructure/ Prisma、認証などの外部実装
    src/presentation/  HTTPとレスポンス変換
    prisma/            現行スキーマとmigration
packages/shared/       通信に使う共有型
tests/                 domain・usecase・HTTP・Webの試験
docs/                  仕様、試験、運用、作業ごとの検証記録
.harness/              共通開発ルールの参照と検証設定
```

HTTPの組み立てには保存先を注入でき、業務ルールを本番実装のまま、実DBなしで試験できます。Prismaの保存処理やトランザクションは別のDB試験で確認します。
AI支援開発のルールはGit submoduleの共通Harnessを参照し、検証内容は[Project Profile](.harness/project.json)で定義しています。

## 検証状況

直近のmainへ取り込まれた[申請詳細の検証記録](docs/work/harness-refresh-detail-design/result.md)では、**332件の試験、型検査、本番ビルド、テキスト形式・秘密情報の検査が成功**しています。
これは記録された時点のローカル検証結果です。GitHub Actionsでの成功を示すものではありません。

| 確認対象 | 実施内容と限界 |
| --- | --- |
| 自動試験 | domain・usecase・HTTP・Webのロジックや部品を検証。標準試験はDB接続なしで実行 |
| ブラウザ | 架空ユーザーとメモリAPIで操作・日英表示・1280px/390pxの表示を確認。全ブラウザ・実機・全画面の自動E2Eを保証するものではない |
| DB競合 | 専用の使い捨てPostgreSQLで、同時承認・編集・提出・削除との競合、履歴追加失敗時のロールバックなど7シナリオを確認 |
| 未整備 | lint、ブラウザ試験の自動Runner登録、依存の既知脆弱性監査 |

DB競合の具体的な結果と未検証範囲は[競合制御の検証記録](docs/work/concurrency-csrf/result.md)を参照してください。その時点の全体検証には未通過項目もあり、DB試験の成功とは分けて記録しています。
専用DBでの成功は、既存DBへの移行やバックアップ復元の保証ではありません。

### 自動検証の実行

GitHub Actionsの定義は`.github/workflows/validation.yml`です。同一repositoryのPR、mainへのpush、手動実行で、以下と同じProject Profileを実行します。共通Harnessが非公開のため、専用の読み取り認証をActions secret `HARNESS_READ_TOKEN`へ設定する必要があります。未設定では検証jobが失敗します。設定と対象範囲は[CI手順](docs/runbook.md#github-actionsの検証)を参照してください。

forkのPRは、非公開Harnessと専用secretを渡さないため対象外です。workflowの追加だけでCI成功とは扱わず、各PRの実行結果を確認します。ブラウザ機能試験や実DB試験も、このCIでは実行しません。

依存とPrisma Clientを準備した環境で実行します。

```sh
node .harness/upstream/scripts/validate-config.mjs
node .harness/upstream/scripts/validate.mjs
```

2つ目は実行予定を表示するだけです。内容を確認してから、次のコマンドで実行します。

```sh
NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute
```

個別には`pnpm typecheck`、`pnpm test`、`pnpm build`を使えます。型検査は各workspaceに加え、ルートのテストと生成済みAPI型も対象です。
lintは未導入のため理由付きでskipします。型検査やbuildがlintの代わりにすべての問題を検出するとは扱いません。
DB競合試験は標準の`pnpm test`には含まれず、[試験仕様書](docs/tests/functional/concurrency-csrf.md)の専用DB手順で明示実行します。

## ローカル起動

Node.js 22.12以上、Corepack、Docker Composeを利用できる環境が必要です。以下はローカル開発用で、既存・共有DBへの適用手順ではありません。

### 1. ソースと依存を準備する

```sh
git clone --recurse-submodules https://github.com/Czmirror/MiniFlow.git
cd MiniFlow
corepack enable
corepack prepare pnpm@10.6.3 --activate
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:generate
```

既存のcloneでは`git submodule update --init --recursive`でHarnessを準備します。
installではライフサイクルスクリプトを実行せず、Prisma Clientを明示生成します。`db:generate`はコード生成で、DBへのmigration適用ではありません。必要なPrisma engineが手元にない場合は取得が発生します。

### 2. 環境を設定する

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

APIを起動するプロセスに`JWT_SECRET`と`DATABASE_URL`を設定します。`JWT_SECRET`は例の値をそのまま使わず、自分の開発環境用に用意し、Git・コマンド引数・共有ログへ記載しないでください。ファイルをコピーするだけで、APIプロセスへの環境変数の設定が済んだとは扱いません。
Prisma用の接続設定とAPIプロセスの`DATABASE_URL`は、同じ開発用DBへ向けます。Webの`NEXT_PUBLIC_API_BASE_URL`には公開可能なAPIのURLだけを設定します。

| ローカル既定値 | 接続先 |
| --- | --- |
| Web | `http://localhost:3100` |
| API | `http://localhost:3001` |
| PostgreSQL | `localhost:5432`、開発用DB名`miniflow` |

Host・Originの設定を変更する場合は[ローカル運用手順](docs/runbook.md)を参照してください。

### 3. DBと初期管理者を準備する

```sh
docker compose up -d
```

この構成はローカル開発用のPostgreSQLと永続volumeを作ります。すでに同じportやvolumeを使っている場合は、対象を確認してから進めてください。
接続先を確認した新規の開発用DBへ、既存migrationを適用します。

```sh
pnpm --filter @miniflow/api exec prisma migrate deploy
```

migrationはDBの構造を変更します。既存・共有DBでは、バックアップなどを含む[適用手順](docs/runbook.md#sessionversion-migration)を先に確認してください。
初期管理者は[管理者作成手順](docs/runbook.md#初期管理者の作成)に従い、安全な環境変数の入力経路から設定してCLIで作成します。公開登録や固定のデモアカウントはありません。

### 4. APIとWebを起動する

環境変数を設定したターミナルでAPIを起動します。

```sh
pnpm dev:api
```

別のターミナルでWebを起動します。

```sh
pnpm dev:web
```

`http://localhost:3001/health`でDB接続を確認し、[MiniFlow](http://localhost:3100)を開きます。管理者が発行したアカウントでログインし、下書き作成から提出・決裁を試せます。

## 関連文書と次の整備

- [API仕様](docs/API.md)：状態遷移、認証・認可、入力・エラーの契約
- [ローカル運用手順](docs/runbook.md)：環境設定、schema適用、初期管理者の作成
- [現行Prismaスキーマ](apps/api/prisma/schema.prisma)：実装しているモデルと関連
- [ER図（現行Prismaへの更新待ち）](docs/ERD.md)：旧設計資料。teamsテーブルや外部キーなどに現行実装との差があるため、現行DBの説明には上記スキーマを参照
- [要求仕様](docs/PRD.md)・[非機能要求](docs/NFR.md)・[実装ガイド](docs/IMPLEMENTATION_GUIDE.md)：設計資料。現在の実装状況はコードと個別仕様・検証記録も併せて確認
- [全体レビュー記録](docs/work/harness-source-review/review.md)：段階的な改善の出発点。対処済みの課題も含む

次の整備候補は、現行Prismaに対応したER図、ブラウザ試験の自動化、承認フローの操作動画、ロール別認可表です。これらを追加することと、新機能を実装することは分けて進めます。
