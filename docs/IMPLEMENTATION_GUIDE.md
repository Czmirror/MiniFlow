# IMPLEMENTATION GUIDE (for ClaudeCode)

## 0. 絶対的ルール
- `Request.status` は source of truth（正）。`Approval` は履歴として保持する。
- `revise()` は「同一Requestを `Draft` に戻す」。reviseの際に新規Request作成（versioning）は行わない。
- `delete()` は `Draft` と `Rejected` のみ許可。`Pending` / `Approved` / `Deleted` には適用できない。

## 1. MVPスコープ（Minimum Viable Product）
### スコープ内
- 1段承認（`approve` / `reject`）
- `Draft -> submit -> Pending -> approve/reject`
- `Rejected -> revise -> Draft`
- Request検索（最低限: `status`, `teamId`, `createdAt`）
- 承認者資格チェック（Policyで抽象化）

### スコープ対象外
- 多段承認、全員承認、複雑な承認ルーティング
- 通知、リマインド、SLA
- 権限の多階層化
- Deletedの復旧運用

## 2. ユビキタス言語
- `Request`: 申請（Aggregate Root）
- `Approval`: 承認/却下の履歴
- `Status`: `Draft` / `Pending` / `Approved` / `Rejected` / `Deleted`
- `ApproverPolicy`: 承認可能かを判定するドメインinterface

## 3. 状態遷移（決定版）
### 3.1 遷移表
- `Draft`: `submit -> Pending`, `delete -> Deleted`
- `Pending`: `approve -> Approved`, `reject -> Rejected`
- `Rejected`: `revise -> Draft`, `delete -> Deleted`
- `Approved`: 遷移なし（終端）
- `Deleted`: 遷移なし（終端）

### 3.2 Invariant（常に真となる想定）
- `Approved` / `Deleted` は終端であり状態変更不可
- `status` は enum のいずれか
- `Approval` は `Pending` のときのみ追加される
- `Approval` は insert only（更新・削除しない）

### 3.3 Precondition（操作成立条件）
- `submit()` は `Draft` のみ
- `approve()` / `reject()` は `Pending` のみ
- `revise()` は `Rejected` のみ
- `delete()` は `Draft` / `Rejected` のみ

## 4. ドメインモデル指示
### 4.1 Aggregate: Request
- フィールド例: `id`, `teamId`, `title`, `body`, `status`, `createdBy`, `createdAt`, `updatedAt`
- 必須メソッド:
  - `submit()`
  - `approve(actorId)`
  - `reject(actorId, reason?)`
  - `revise(actorId)`
  - `delete(actorId)`
- 各メソッドで必ず実施:
  - Preconditionチェック
  - Invariant維持
  - `status` 更新
  - 必要時の `Approval` 追加（`approve` / `reject`）
- 違反時は `DomainError` を送出

### 4.2 Entity: Approval
- フィールド例: `id`, `requestId`, `actedBy`, `actionType(Approved|Rejected)`, `reason?`, `createdAt`
- `Approval` が状態の正を決めるのではなく、状態更新は `Request` が担う

### 4.3 Policy
- `interface ApproverPolicy`
  - `canApprove(request, actorId): boolean`
  - `canReject(request, actorId): boolean`
- 実装は application/infrastructure に配置
- domain には抽象のみ置く

## 5. レイヤ構成（固定）
- `src/domain`
  - `request/Request.ts`
  - `request/Approval.ts`
  - `request/Status.ts`
  - `policies/ApproverPolicy.ts`
  - `errors/DomainError.ts`
- `src/application`
  - `usecases/CreateDraft.ts`
  - `usecases/SubmitRequest.ts`
  - `usecases/ApproveRequest.ts`
  - `usecases/RejectRequest.ts`
  - `usecases/ReviseRequest.ts`
  - `usecases/DeleteRequest.ts`
  - `ports/RequestRepository.ts`
  - `ports/TransactionManager.ts`（任意）
- `src/infrastructure`
  - `db/*`
  - `repositories/RequestRepositoryImpl.ts`
  - `policies/ApproverPolicyImpl.ts`
- `src/presentation`
  - `http/*`
  - `error-mapper/*`

依存方向:
- `presentation -> application -> domain`
- `infrastructure` は interface 実装側

## 6. DB方針
- `requests` テーブルに `status`（NOT NULL）を保持
- `approvals` テーブルは履歴（insert only）
- `approve/reject` は同一トランザクションで以下を実行:
  - `requests.status` 更新
  - `approvals` 追加
- `revise` は同一トランザクションで `requests.status = Draft` に更新
- MVPでは `revise` 時に `Approval` は追加しない

注記:
- `revise` の実行者履歴を厳密に残したい場合、将来 `actionType=Revised` を追加する

## 7. API最小仕様
- `POST /requests`（Draft作成）
- `POST /requests/:id/submit`
- `POST /requests/:id/approve`
- `POST /requests/:id/reject`
- `POST /requests/:id/revise`
- `POST /requests/:id/delete`
- `GET /requests?teamId=&status=&from=&to=`
- `GET /requests/:id`（詳細 + approvals）

エラー方針:
- `400`: 入力不正
- `403`: 権限不足（Policy）
- `404`: Not Found
- `409`: 状態不整合（Precondition違反）

## 8. テスト戦略
### 8.1 Domainユニット（表駆動）
- `Draft` で `submit` 成功
- `Draft` で `approve` 失敗
- `Pending` で `approve` 成功 + `Approval` 1件追加
- `Pending` で `reject` 成功 + `Approval` 1件追加
- `Rejected` で `revise` 成功（`Approval` 追加なし）
- `Pending` で `delete` 失敗
- `Approved` で `delete` 失敗
- `Deleted` で `submit/approve/reject/revise/delete` 失敗
- `ApproverPolicy=false` で `approve/reject` は `403` 相当

### 8.2 Applicationテスト
- 各UseCaseで成功ケース1本
- 各UseCaseで失敗ケース2本（権限NG・状態NG）
- Repository / Policy をモックして境界を検証

## 9. 実装順序（ClaudeCode投入順）
1. domain（`Request` / `Approval` / `Status` / `DomainError`） + domain tests
2. application usecases（repo/policy注入）
3. infrastructure（DB, repo実装, policy実装, Tx）
4. presentation（HTTP, validation, error mapping）
5. e2e（主要2-3本）

## 10. ClaudeCodeへの指示テンプレ
### Step 1: Domain
「domain層のみ実装してください。状態遷移とPrecondition/Invariantを `Request` に実装し、`DomainError` を定義。外部依存は禁止。表駆動でdomainテストも作成してください。」

### Step 2: Application
「application層のusecaseを実装してください。Repository/ApproverPolicyはinterface注入。成功系1件、失敗系2件ずつのテストを追加してください。」

### Step 3: Infrastructure
「infrastructure層を実装してください。Repository実装とApproverPolicy実装を追加し、approve/reject時に `status更新 + approval追加` を同一トランザクションにしてください。」

### Step 4: Presentation
「HTTP APIを実装してください。エラーを `400/403/404/409` にマッピングし、`/requests` 系エンドポイントを公開してください。」

### Step 5: Verification
「主要フロー（submit, approve, reject, revise, delete）の結合テストを追加してください。`delete` は `Draft/Rejected` のみ成功であることを検証してください。」
