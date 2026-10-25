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
