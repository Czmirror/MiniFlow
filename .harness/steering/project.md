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
