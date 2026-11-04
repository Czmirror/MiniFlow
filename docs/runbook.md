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
