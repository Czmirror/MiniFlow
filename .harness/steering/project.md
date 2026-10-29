# MiniFlowの作業コンテキスト

2026-10-25に `.ai-context/hot.md` から移行。以下は要件・既知の課題であり、現在の実装状況を保証しない。

## Current Permission Issues

- Team switcher is visible to all users in the top-right area.
- Requesters and approvers can freely change their current team.
- This is incorrect because team assignment should be controlled only by system administrators.
- Normal users must not freely join or switch teams.
- For normal users, current team should be displayed as read-only.

## Current Layout Issues

- The left header title always displays "ダッシュボード" regardless of the current page.
- Page title must reflect the current route.

Expected titles:

- ダッシュボード
- 申請一覧
- 自分の申請
- 承認待ち
- 申請作成
- 申請詳細
- アカウント設定
- ユーザー管理

## Next Fix Priority

1. Restrict team switching to system administrators only
2. Replace team selector with read-only team display for normal users
3. Fix page title handling based on current route
4. Add permission checks for team-related operations
5. Add layout tests for page title rendering

## Decision

- Team assignment is admin-controlled.
- Normal users cannot freely switch organizations or teams.
- Current page title must always match the active route.

---

## 未確定事項

未確定の設計判断は実装前に確認する。

## Questions
RoleとApproverPolicyの責務境界。

## Next implementation
1. Role enum追加
2. Permission判定
3. Submit usecase追加
4. Status UI改善





---
## UI Scope (MVP)
Required screens:
- Login
- Dashboard
- Request List
- My Requests
- Pending Approvals
- Request Create
- Request Detail
- Account Settings
- User Management
User Management actions:
- Create User
- Edit User
- Disable User
Do NOT implement:
- Public signup
- Email invitation
- Notification center
- LINE integration
- Multi-step approval
---
## Active Areas
- apps/api/src/domain/request
- apps/api/src/domain/user
- Prisma schema/migrations
- request approval lifecycle
- account settings
- domain/application tests
---
## Ignore For Now
- LINE integration
- notification system
- deployment optimization
- full i18n framework

## ソースの地図

- `apps/api/src/presentation/http/`: HTTP・認証cookie・レスポンス変換。
- `apps/api/src/application/`: 認証・申請usecaseと保存契約。
- `apps/api/src/domain/`: 現行のRequest/Approval/User。申請テストの正本。
- `apps/api/src/infrastructure/`: Prisma・DB・password/JWT等の外部I/O。
- `apps/web/app/` と `apps/web/src/`: Next.jsの入口、画面、APIクライアント。
- `apps/web/src/components/RequestDeleteAction.tsx`: 申請名・注意書き・キャンセルを持つ削除確認。通信は親画面が担当する。
- `apps/web/src/lib/requestEditor.ts`: 未保存の下書きと保留中の移動の純粋な状態遷移。認証境界・申請・保存基準が変わると旧状態を使わない。
- `apps/web/src/hooks/useRequestEditor.ts`: 編集状態とブラウザ離脱警告の寿命。実際の移動・通信は親へ委ねる。
- `apps/web/src/components/RequestLeaveDialog.tsx`: 未保存の下書きから移動する前の確認とfocus復帰。
- `apps/web/src/lib/canDeleteRequest.ts`: 同じチームの本人または管理者に、下書き・差し戻しの削除操作を表示する条件。サーバーの認可を代替しない。
- `packages/shared/src/`: 通信用の共有型。`src/shared/api-types.ts` はOpenAPI生成型として保持。
- `tests/domain/` と `tests/application/`: 現行APIの状態遷移・usecaseを検証。旧rootのdomain/applicationは削除済み。
- `tests/support/requests.ts`: 固定時刻のfixtureとメモリ保存先。業務ルールは本番からimportする。
- `tests/apps/`: 現行APIの認証・承認保存契約、HTTP/画面の既存検査。
- `docs/templates/request-state-transition.md`: 旧テストから現行テストへの対応案内。

## 既知の問題

全体レビューと段階的な改善計画は `docs/work/harness-source-review/`。第1段階は検証依存・テスト移行・書式修正のみ。公開registerと要件の衝突、入力・認証・競合・UIの課題は後続段階で扱い、この段階で仕様を変更しない。過去の課題一覧には対処済み項目も含まれ、実装状況はレビュー記録と照合する。

## 第2段階の変更

- `presentation/http/createHttpServer.ts`: Host/Origin・入力schema・認証pluginとrouteを組み立てる。保存先を注入し、実DBの組立はserver.tsに残す。
- `presentation/http/validation/schemas.ts` と `application/auth/validation/profile.ts`: HTTP構造とauth profileの条件。
- `cli/adminCommand.ts` / `cli/createAdmin.ts`: 管理者CLIの入力処理とローカル実行。公開signupは削除。旧Web AuthPanelも削除。
- `tests/support/http.ts`: 実HTTPへ接続するメモリ保存先と架空ユーザー。
- JWTは8時間、password変更は認証世代を増やして全失効。設定・適用・初期Admin作成は `docs/runbook.md`。
- sessionVersion migrationはファイル作成のみ。実DBへの適用・実ユーザー作成は未実施。
- 第2段階の仕様・試験・記録は `docs/API.md`、`docs/tests/`、`docs/work/auth-input-boundaries/`。
- `apps/web/src/lib/apiTransport.ts`: WebのHTTP失敗statusとCSRFキャッシュを保持する。401を受けた画面は認証stateを破棄してログインへ戻る。

## 第3段階の変更

- Requestの保存versionはrepositoryが成功時だけincrementし、全申請更新で比較する。DTOは内部versionを公開しない。
- `infrastructure/auth/csrf.ts`はログインsessionに結び付けたHMACを扱い、Web apiTransportは未完了の同時取得だけ共有する。
- `presentation/http/operationEvents.ts`は応答完了後の業務イベントを固定fieldで記録する。
- `tests/integration/requestConcurrency.integration.ts`は専用DBへの明示起動用。既存.envを使わず、承認された使い捨てDBに限定する。
- 第3段階の仕様はdocs/API.md、試験はdocs/tests、計画と記録はdocs/work/concurrency-csrf。

## 申請のページ送りと集計

- `application/requests/GetRequestSummary.ts`: 同一チームの全件集計をrepositoryへ依頼する。
- `apps/web/src/hooks/useRequestCollection.ts`: 認証・画面・ページに対応する取得状態と旧応答の無効化。
- `apps/web/src/lib/requestCollection.ts`: 全件集計と用途別ページの取得、空の最終ページの補正。
- `apps/web/src/lib/requestListSelection.ts`: 一覧別のページ・状態条件を扱う純粋な状態操作。認証・所属・権限の境界が変わると初期位置に戻す。
- 一覧の用途はall/mine/pendingApprovals。本人とチームはサーバーの認証情報から解決する。Webの全件集計はサーバー応答を使用する。

- `tests/integration/requestPagination.integration.ts`: 専用の使い捨てPostgreSQLだけでページ境界と同時刻の安定順を検証する明示起動用試験。

## 本人情報の画面同期

- `apps/web/src/lib/currentRequestDetail.ts`: 呼び出し元の世代と照合し、古い詳細の成功・失敗を破棄する。通信と画面状態は所有しない。
- `apps/web/src/lib/managedUserChange.ts`: 管理更新応答が本人の所属・権限境界を変えるかを判定する。
- `MiniFlowApp.handleUserUpdate`: 本人変更を反映し、所属・role変更では旧画面と未保存入力をresetする。認証破棄後の遅い応答は世代で拒否する。
- 画面仕様は`docs/specs/account-context.md`、試験は`docs/tests/`、作業記録は`docs/work/account-context-sync/`。

## 表示言語の分離

- `apps/web/src/lib/messages.ts`: 日本語・英語の文言と読み取り専用型を持つ。選択中の言語は持たない。
- `MiniFlowApp`は自身のlocaleから文言を選び、子画面と表示補助へ明示的に渡す。
- `tests/apps/web/LocaleIsolation.spec.ts`: 本番のDashboardと表・状態表示を交互に日英で描画する回帰試験。
- 計画・検証記録は`docs/work/locale-isolation/`。

## API内部の依存境界

- `domain/errors/StateConflictError.ts`: 業務状態・保存競合の例外。HTTP 409への変換はHTTP routeが担当する。
- `application/ports/PasswordOperations.ts`: 認証usecaseが受け取る非同期hash・照合の契約。
- `infrastructure/auth/password.ts`: 既存のbcrypt実装。HTTPとCLIの組立がusecaseへ明示的に渡す。
- 試験と記録は`docs/tests/unit/api-dependency-boundaries.md`と`docs/work/api-dependency-boundaries/`。

## ダッシュボードの一覧導線

- `apps/web/src/lib/dashboardShortcut.ts`: 件数カードと抜粋の操作を、固定の一覧と状態へ対応させる。通信・集計・認可は持たない。
- 仕様・試験と計画は`docs/specs/dashboard-shortcuts.md`、`docs/tests/`、`docs/work/dashboard-shortcuts/`。

## 一覧の状態フィルター

- `lib/requestStatusFilter.ts`: 固定選択肢と未知値の拒否。表示名は既存messagesを使う。
- `useRequestCollection`: 一覧別の条件を認証・所属境界内で保持し、条件変更でpageと取得世代を更新する。
- `MiniFlowApp.RequestList`: 条件・取得結果・再試行を表示し、通信は取得hookへ委ねる。
- 仕様は`docs/specs/request-status-filter.md`、試験と記録は`docs/tests/`と`docs/work/request-status-filter/`。
