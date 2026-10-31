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

## 申請の保存世代とCSRFの切り替え

`20261026010000_add_request_version`はrequestsへINTEGER NOT NULL DEFAULT 0を追加する。新コードの起動前に適用が必要。既存DBへの適用は別承認であり、今回適用したのは専用の使い捨てDBだけ。追加列を削除するrollbackは行わず、前進修正を優先する。
ログイン識別子を含まない旧JWTは拒否するため、更新後は再ログインが必要。CSRFはそのログインに結び付け、GET取得でcookieを変えない。Webは更新前に取得し、同時取得だけを共有する。
申請の競合は409となる。再取得して内容を確認してから操作し、変更を自動再送しない。このversionはサーバー内の取得から保存までの鮮度であり、古い画面表示そのものは検知しない。
業務イベントは既存loggerに安全な識別子と操作結果だけ記録する。永続監査台帳や配送保証は提供しない。

## 申請詳細の確認

申請詳細は現在状態、差し戻し理由、本文、次の操作、承認履歴の順に確認する。差し戻し理由の強調は現在も差し戻しの場合だけで、過去の理由は履歴に残る。「下書きに戻す」で修正し、保存または再申請する。承認履歴は記録された決定を古い順に表示し、作成・提出イベントは含まない。取得失敗は「再試行」または「戻る」で復帰する。権限と未保存・削除確認の手順は維持する。
