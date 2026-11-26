# MiniFlow ローカル運用

## 認証設定

Node.js 22.12以上、pnpm 10.6.3を使う。APIを起動するプロセスに `JWT_SECRET` を非空で渡す。固定の開発鍵へのfallbackはない。
秘密はGit・引数・ログへ書かず、開発環境の秘密設定またはGit管理外の環境から渡す。AIへ既存の秘密を提示する必要はない。
鍵の切り替えと今回の旧形式tokenの廃止により、利用者は再ログインが必要。

| 設定 | 既定・用途 |
| --- | --- |
| PORT | 3001、1〜65535の整数 |
| HOST | 127.0.0.1。Docker内だけDockerfileで0.0.0.0を明示 |
| API_ALLOWED_HOSTS | localhost:PORT、127.0.0.1:PORT、[::1]:PORT。変更時はカンマ区切りでhost:portを列挙。wildcardは禁止 |
| CORS_ORIGIN | http://localhost:3100。scheme/host/portを持つ単一Origin。path・query・資格情報を含めない |
| JWT_SECRET | 必須。秘密設定から注入 |
| DATABASE_URL | 既存のローカルPostgreSQL接続。実値を公開しない |

リバースプロキシやカスタムdomainではAPIへ実際に届くHostを許可する。Host検査はforwarded headerの自己申告へ置き換えない。

## sessionVersion migration

`apps/api/prisma/migrations/20261026000000_add_session_version/migration.sql` はusersにINTEGER NOT NULL DEFAULT 0の列を追加する。既存ユーザー、password、申請を削除しない。
DBへの適用前に、対象環境・バックアップ・users件数・lock時間の許容・停止手順を運用者が確認する。共有DB/既存データへ自動適用しない。
適用する場合の既存コマンドは `pnpm --filter @miniflow/api exec prisma migrate deploy`。これはDDLを適用するため、対象を限定した操作承認後にのみ実行する。

Clientの生成は `pnpm db:generate`。これはコード生成で、migration適用ではない。アプリは新列を参照するため、実DBを使う起動の前にschema適用を済ませる。
rollbackは新列を保持して前進修正する案を優先する。列削除や旧期限なしtokenの再許可を自動rollbackに含めない。

## 初期管理者の作成

公開signupはない。DB権限のある運用者がローカルCLIを実行する。CLIは新しいemailのAdminだけを作り、既存emailのpasswordや権限を上書きしない。
以下の環境変数を安全な入力経路から渡す。passwordをコマンド引数・shell履歴・共有ログに書かない。

- MINIFLOW_ADMIN_EMAIL
- MINIFLOW_ADMIN_PASSWORD（既存の8文字以上の規則）
- MINIFLOW_ADMIN_TEAM_ID（所属する非空team）

設定後、`pnpm --filter @miniflow/api admin:create` を実行する。成功/失敗のメッセージに入力値は出さない。
完了後は一時的な環境変数を破棄する。実際の作成はDBへの書き込みであり、対象DBと作成内容を確認して実行する。この実装作業では実行していない。

## パスワード変更後

有効期限は8時間。password変更はhashと認証世代を同時更新し、操作中を含め全tokenを失効させる。画面はログインへ戻る。
logoutは操作中ブラウザのcookie削除だけで、全セッション失効と同義ではない。

## 検証の限界

HTTPとブラウザのfixture試験は架空ユーザーのメモリ保存先を使う。第3段階では別途、専用の使い捨てPostgreSQL16でmigration・競合・rollbackを検証した。既存DBの移行時間やバックアップ復元が成功した証明ではない。

## GitHub Actionsの検証

`.github/workflows/validation.yml`は同一repositoryのPR、mainへのpush、手動実行を対象にする。forkのPRはjobをskipする。同一repositoryにbranchを書ける人のコードだけを、非公開Harnessを取得するrunnerで実行する。branch保護やマージ制限はこのworkflowでは設定しない。

非公開の共通Harnessを取得する認証を、MiniFlowのSettings → Secrets and variables → Actionsのrepository secret `HARNESS_READ_TOKEN`へ設定する。fine-grained tokenでは対象repositoryを`Czmirror/ai-dev-context`だけにし、Contents: readと自動付与のMetadata: readに限定する。発行主体・有効期限は運用者が決める。値はGitHubの設定欄だけに直接入力し、チャット・TickTick・Git・ログに書かない。既存の個人用tokenを流用・権限拡大しない。

認証未設定なら固定の案内を出して失敗し、検証を省略して成功にしない。設定後は対象PRの失敗jobを再実行する。取得先は固定repository、revisionはMiniFlowが追跡するgitlinkのSHAであり、`.gitmodules`の任意URLや可変branchを取得しない。

runnerは読み取り権限、20分の上限、cacheなしで動く。依存のlifecycle scriptを止めてinstallした後、Prisma Clientを明示生成し、ローカルと同じProfileを実行する。DB接続・migration・deploy・自動commit・artifactのuploadは行わない。Actionは固定SHAで使う。更新時は出典・権限・入力を確認し、CI差分としてレビューする。

正常なGitHub-hosted runner上での一連の成功は、専用認証の設定後に確認する。ローカルの成功やworkflowの構文だけで成功済みとは記録しない。無効化が必要な場合はworkflowを停止し、専用の参照権限を失効する。

## 申請の保存世代とCSRFの切り替え

`20261026010000_add_request_version`はrequestsへINTEGER NOT NULL DEFAULT 0を追加する。新コードの起動前に適用が必要。既存DBへの適用は別承認であり、今回適用したのは専用の使い捨てDBだけ。追加列を削除するrollbackは行わず、前進修正を優先する。
ログイン識別子を含まない旧JWTは拒否するため、更新後は再ログインが必要。CSRFはそのログインに結び付け、GET取得でcookieを変えない。Webは更新前に取得し、同時取得だけを共有する。
申請の競合は409となる。再取得して内容を確認してから操作し、変更を自動再送しない。このversionはサーバー内の取得から保存までの鮮度であり、古い画面表示そのものは検知しない。
業務イベントは既存loggerに安全な識別子と操作結果だけ記録する。永続監査台帳や配送保証は提供しない。

## 申請詳細の確認

申請詳細は現在状態、差し戻し理由、本文、次の操作、承認履歴の順に確認する。差し戻し理由の強調は現在も差し戻しの場合だけで、過去の理由は履歴に残る。「下書きに戻す」で修正し、保存または再申請する。承認履歴は記録された決定を古い順に表示し、作成・提出イベントは含まない。取得失敗は「再試行」または「戻る」で復帰する。権限と未保存・削除確認の手順は維持する。

## 申請作成中の通信失敗

作成成功後は申請詳細へ移り、作成画面の入力は空になる。提出結果を確認できない場合も、新しく作成し直さず詳細の最新状態を確認する。下書きなら同じ申請を提出できる。承認待ちなら提出済みなので再提出しない。詳細を取得できない場合は「再試行」で同じ申請を取得する。

作成そのものの保存結果を確認できない場合は、作成画面に入力が残る。応答だけ失われて保存済みの可能性があるため、再操作の前に一覧で確認する。この場合の重複防止をAPI側で保証する仕組みは未実装。認証切れではログインへ戻り、旧画面の入力を消去する。

## 公開プレビューの準備

現状は公開前の準備段階。ここにある設定の検証成功だけでは公開可能と判断しない。まずアクセスを制限したプレビューで、以下の確認を行う。公開URL・契約先・ドメイン・運用責任者は未決定。

### 構成と設定

WebとAPIは同じサイトのHTTPS配下に配置する。例は`https://app.example.test`と`https://api.example.test`。これらは説明用の架空ドメインで、実際の配信先ではない。無関係な配信サービスの別ドメインへ分けると、SameSite=LaxのCookieが送られずログインが成立しない場合がある。`SameSite=None`へ緩めて対処せず、配信先のドメインを揃える。

HTTPSは配信基盤で終端する。APIへ届くHostを確認して許可リストへ明示し、任意の`X-Forwarded-Host`を信用しない。APIとDBへの直接接続を制限し、DBをインターネットへ開放しない。

| 設定先 | キー | 条件 |
| --- | --- | --- |
| APIの実行環境 | NODE_ENV | `production`。未指定は開発モードなので、配信設定で必ず明示する |
| APIの実行環境 | CORS_ORIGIN | WebのHTTPS Originを1つ指定。path・query・認証情報は不可 |
| APIの実行環境 | API_ALLOWED_HOSTS | APIへ実際に届くHostをカンマ区切りで指定。wildcardは不可 |
| APIの秘密設定 | JWT_SECRET | 専用の乱数から生成した32バイト以上の鍵。既知のテスト鍵を使わない |
| API・Prismaの秘密設定 | DATABASE_URL | プレビュー専用PostgreSQLのURL。実データ用DBと分離し、提供元のTLS接続設定に従う |
| APIの実行環境 | HOST・PORT | 配信基盤の内部ネットワークに合わせる。外部への直接公開範囲を確認する |
| Webのビルド環境 | NEXT_PUBLIC_API_BASE_URL | 公開可能なHTTPSのAPI URLのみ。秘密を入れない。ビルド時に埋め込まれるため変更後は再ビルドする |

本番APIは設定不足・HTTP Origin・短い署名鍵・PostgreSQL以外のDB URLなら起動前に拒否する。エラーは設定名だけを示し、実値を出さない。鍵の長さは乱数の強度を保証しない。

`apps/api/Dockerfile`は本番用APIイメージを作る。[コンテナの手順](#apiの本番コンテナ)に従う。配信基盤はNode 22.12以上とpnpm 10.6.3を指定し、固定lockfileからlifecycle scriptを止めて依存を入れ、Prisma Clientを生成してビルドする。既存の本番起動コマンドはAPIが`pnpm --filter @miniflow/api start`、Webが`pnpm --filter @miniflow/web start`。必要な環境変数を配信基盤側で先に注入する。DBのmigrationはビルド・起動へ自動的に混ぜない。

### データとアクセス

架空の申請だけを使い、利用者へ実名・社内情報・本物のメールアドレス等を入力しないよう案内する。初期管理者は専用DBに既存CLIで作成し、管理者が専用のApplicantとApproverを発行する。管理者資格情報・JWT・DB URLは共有しない。`tests/support`の固定鍵・固定パスワードを公開環境へ流用しない。

現状、共有デモアカウントのパスワード変更・データ蓄積を防ぐ公開デモ専用モードや、ログイン試行の回数制限はない。不特定多数へアカウントを公開しない。招待した相手に限定するアクセス制御、データの初期化方法・頻度・責任者、改変時の復旧方法を決めてから公開する。データ削除やDB再作成は対象DBとバックアップを確認し、別途承認して実行する。

### 公開先での受け入れ確認

- 配信基盤のアクセス制御を有効にした状態で、承認済みrevisionの成果物を配信する。配信されたHTML・静的ファイルのハッシュやサイズを手元の成果物と照合する。
- 実ブラウザでHTTPS・証明書・CookieのSecure / HttpOnly / SameSite / Pathを確認する。ログイン、画面再読込による認証復帰、CSRF付き更新、ログアウト後の未認証を確認する。Cookieの値は記録しない。
- [実DBの承認フロー](work/postgres-workflow-e2e/result.md)と同じ、申請→提出→理由付き差し戻し→修正→再提出→承認を行う。別チームから非表示であることと、API再起動後の保持も確認する。
- 未許可Originの更新、未知Host、CSRFなし、未ログインの操作が拒否されることを確認する。CORSを認可の代わりにしない。
- 正常なCORS preflightと更新が成功し、Cookieを落とすキャッシュ・プロキシ設定がないことを確認する。認証付き応答を共有キャッシュへ保存しない。
- 開始日時、revision、確認結果と未確認事項を秘密・個人情報なしで記録する。問題があれば配信基盤のアクセスを閉じて停止し、前進修正後に再検証する。

今回はローカルの本番HTTP試験で設定・Cookie属性・Host/Origin/CSRFを検証する。公開先のリソース作成、TLS終端、DNS、ブラウザによるSecure Cookieの受理、専用DBへのmigration・アカウント作成は未実施。[作業結果](work/preview-config/result.md)を参照。


## APIの本番コンテナ

repository rootでビルドする。公式Node 22系のbase imageをdigest固定し、pnpm 10.6.3とlockfileを使う。依存のlifecycle scriptは止め、Prisma Clientを明示生成してAPIをコンパイルする。Prisma生成はDBへのmigrationではない。

```sh
docker build -f apps/api/Dockerfile -t miniflow-api:preview .
```

`.dockerignore`は必要なAPI・共有型・manifestだけを許可する。`.env`・秘密鍵・Git・Harness・テスト・Web・ローカル依存はビルドcontextへ渡さない。Dockerfileは実行用imageへ本番依存・ビルド済みJavaScript・package.jsonだけをコピーする。`fastify-plugin`は本番コードから直接使うため本番依存へ分類している。packageの新規追加やversion更新は行っていない。

最終imageは`node`ユーザー（UID 1000）で`node dist/main.js`を実行する。Node 22.23.5のLinux/arm64でローカル確認済み。別architectureは未検証。イメージにpnpm・Prisma CLIの操作経路を用意せず、migrationは別の管理された実行環境で、対象DBを確認して個別承認後に行う。

必要な本番設定は上の公開プレビュー設定表に従う。秘密は実行基盤の秘密設定から渡す。ローカルで確認する場合だけ、Git管理外の安全な場所へ開発用の設定ファイルを用意し、そのファイルを`--env-file`で指定する。実値を引数やshell履歴へ書かない。

```sh
docker run --rm --init --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --env-file /safe/location/preview.env --env NODE_ENV=production \
  -p 127.0.0.1:3001:3001 miniflow-api:preview
```

上のファイルpathは説明用。Hostの許可リストは実際の接続先に合わせる。HTTPSは配信基盤で終端し、この例のHTTP待ち受けをインターネットへ直接公開しない。Web用イメージ・TLS・DB・デモアカウントはこのimageには含まれない。

ローカル試験はDBなしの未認証応答・Host拒否・CORS preflightまで。[試験結果](work/preview-api-container/result.md)に確認範囲を残す。配信時は承認済みrevisionから作った同じimage digestを環境間で使い、戻す場合はアクセスを閉じて前の承認済みimageへ戻す。DBのschema・データを自動で巻き戻さない。

base image内と依存package内のライセンス文は保持する。repository自体のLICENSEは未設定で、imageの外部配布は今回行わない。配布条件・必要な表示の最終確認は公開方法を決める段階に残る。

## Webコンテナの起動

repository rootで`docker build -f apps/web/Dockerfile -t miniflow-web:local .`を実行する。build用のAPI接続先は既定で`/api`。変更する場合は公開情報だけを`--build-arg NEXT_PUBLIC_API_BASE_URL=...`で指定し、imageを作り直す。秘密やDB設定を渡さない。

`docker run --rm --init --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --cap-drop ALL --security-opt no-new-privileges -p 127.0.0.1:43152:3000 miniflow-web:local`でローカル起動できる。Docker Webは`/api`を固定内部`http://api:3001`へ転送する。APIの`API_ALLOWED_HOSTS`は`api:3001`とし、同じ私設ネットワークへ接続する。HTTPS入口はWebだけへ転送し、APIを直接公開しない。imageはnodeユーザーでstandalone serverを起動する。通常の開発用build/startにはstandalone用envを指定しない。

Webを含む試験は`tests/integration/container.compose.yml`を使う。ComposeがWebも起動するため、ホストでNextを別起動しない。migrationと架空ユーザー投入は個別承認された使い捨てDBだけで行う。既存の[22項目E2E](work/request-action-guidance/result.md)を同じdriverで再実行する。公開TLS/DNS・共有デモの運用は未構築。

## APIのcache方針

認証・申請・管理を含む全API応答は、成功/拒否/障害/空応答とも`Cache-Control: no-store`を返す。共有cacheとブラウザのHTTP cacheへ保存させないための指定であり、過去のcacheや履歴・画面メモリを消去する機能ではない。公開先でheaderを上書きせず、認証付きAPIをcacheする設定を追加しない。WebのHTML/staticのcacheとは区別する。[仕様と試験](specs/api-cache-safety.md)を参照。

## Webだけを公開入口にする構成

Docker Webの既定`/api`は本番Webのrewritesで内部APIへ届く。転送先は`api:3001`で固定し、requestのqueryやheaderで任意のURLを指定する機能はない。APIサービス名とportを変える場合はWebの配信設定も変更してimageを作り直す。通常のホスト開発ではこの転送を有効にしない。

ローカルE2Eでは試験TLS入口→Web→API→DBの経路を使う。ComposeのAPIはhost portへ公開しない。DBのloopback portは承認済み初期化試験用であり、このComposeをそのまま公開用へ流用しない。公開先では信頼されたTLS、入口のアクセス制限、非公開DB、専用の秘密設定を別途準備する。

[接続仕様](specs/same-origin-preview.md)と[検証記録](work/same-origin-preview/result.md)を参照。以前のAPI直接port 43151へ接続する手順は現在のComposeでは使わない。過去の作業結果は当時のrevisionの記録として残す。

## Railwayで試す場合

[無料枠の公開準備](railway-preview.md)にサービス構成と設定表をまとめる。Webのbuild引数MINIFLOW_DEPLOY_TARGET=railwayで固定内部api.railway.internal:3001へ接続する。アカウント未接続のため実公開は未実施。localhost DBの既存承認をRailway DBへ適用しない。
