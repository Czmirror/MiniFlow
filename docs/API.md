# API Spec: MiniFlow (v0.1)

## 1. 目的
MiniFlow MVPのHTTP API契約を定義する。  
本書は `PRD` / `NFR` / `ERD` / `IMPLEMENTATION_GUIDE` と整合する。

## 2. 共通仕様
- Base URL: `/api/v1`
- Content-Type: `application/json`
- 認証: 未実装。`createdBy` は API 側で仮固定値を設定する
- ID形式: `uuid`

## 3. エラー形式
```json
{
  "error": {
    "code": "STATE_CONFLICT",
    "message": "approve is only allowed in Pending",
    "status": 409
  }
}
```

ステータスコード方針:
- `400`: 入力不正
- `403`: 権限不足（ApproverPolicy）
- `404`: リソース不存在
- `409`: 状態不整合（Precondition違反）
- `500`: 予期しない内部エラー

## 4. ドメイン型（API上の表現）
### 4.1 Request
```json
{
  "id": "uuid",
  "teamId": "uuid",
  "title": "string",
  "body": "string",
  "status": "Draft|Pending|Approved|Rejected|Deleted",
  "createdBy": "uuid",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z",
  "deletedAt": null
}
```

### 4.2 Approval
```json
{
  "id": "uuid",
  "requestId": "uuid",
  "actedBy": "uuid",
  "actionType": "Approved|Rejected",
  "reason": "string|null",
  "createdAt": "2026-03-01T00:00:00.000Z"
}
```

## 5. エンドポイント
### 5.1 POST /requests
Draftを作成する。

Request:
```json
{
  "teamId": "team-1",
  "title": "稟議: ノートPC購入",
  "body": "業務用端末の更新申請"
}
```

Response `201`:
```json
{
  "id": "uuid",
  "teamId": "team-1",
  "title": "稟議: ノートPC購入",
  "body": "業務用端末の更新申請",
  "status": "Draft",
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z",
  "deletedAt": null
}
```

実装メモ:
- `createdBy` は暫定的に API 側で固定 UUID を設定する
- `teamId`, `title`, `body` が必須

Errors: `400`, `500`

### 5.2 PATCH /requests/:id
Draftの内容を更新する（MVPではDraftのみ）。

Request:
```json
{
  "title": "稟議: ノートPC購入（更新）",
  "body": "業務用端末の更新申請（理由追記）"
}
```

Response `200`:
```json
{
  "id": "uuid",
  "teamId": "team-1",
  "title": "稟議: ノートPC購入（更新）",
  "body": "業務用端末の更新申請（理由追記）",
  "status": "Draft",
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:05:00.000Z",
  "deletedAt": null
}
```

実装メモ:
- `Draft` 以外は `409`
- `title` または `body` の少なくとも片方が必要

Errors: `400`, `404`, `409`, `500`

### 5.3 POST /requests/:id/submit
`Draft -> Pending`

Response `200`:
```json
{
  "id": "uuid",
  "teamId": "team-1",
  "title": "稟議: ノートPC購入",
  "body": "業務用端末の更新申請",
  "status": "Pending",
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:10:00.000Z",
  "deletedAt": null
}
```

実装メモ:
- `Draft` からのみ `Pending` へ遷移する
- 現在は単段承認MVPの前段として submit のみ実装

Errors: `400`, `404`, `409`, `500`

### 5.4 POST /requests/:id/approve
`Pending -> Approved`。成功時にApprovalを1件追加する。

Request:
```json
{
  "reason": "予算内のため承認"
}
```

Response `200`:
```json
{
  "request": {
    "id": "uuid",
    "status": "Approved",
    "updatedAt": "2026-03-01T00:20:00.000Z"
  },
  "approval": {
    "id": "uuid",
    "requestId": "uuid",
    "actedBy": "uuid",
    "actionType": "Approved",
    "reason": "予算内のため承認",
    "createdAt": "2026-03-01T00:20:00.000Z"
  }
}
```

Errors: `403`, `404`, `409`

### 5.5 POST /requests/:id/reject
`Pending -> Rejected`。成功時にApprovalを1件追加する。

Request:
```json
{
  "reason": "金額根拠が不足"
}
```

Response `200`: `status=Rejected` と `approval(actionType=Rejected)`

Errors: `403`, `404`, `409`

### 5.6 POST /requests/:id/revise
`Rejected -> Draft`（同一Requestを戻す）。MVPではApprovalを追加しない。

Response `200`:
```json
{
  "request": {
    "id": "uuid",
    "status": "Draft",
    "updatedAt": "2026-03-01T00:40:00.000Z"
  }
}
```

Errors: `403`, `404`, `409`

### 5.7 POST /requests/:id/delete
論理削除。`Draft/Rejected -> Deleted`

Response `200`:
```json
{
  "request": {
    "id": "uuid",
    "status": "Deleted",
    "deletedAt": "2026-03-01T00:50:00.000Z",
    "updatedAt": "2026-03-01T00:50:00.000Z"
  }
}
```

Errors: `403`, `404`, `409`

### 5.8 GET /requests
一覧検索。デフォルトでDeletedは非表示。

Query:
- `teamId` (required)
- `status` (optional)
- `from` (optional, ISO8601)
- `to` (optional, ISO8601)
- `includeDeleted` (optional, default `false`)
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "teamId": "team-1",
      "title": "稟議: ノートPC購入",
      "body": "業務用端末の更新申請",
      "status": "Draft",
      "createdBy": "00000000-0000-0000-0000-000000000001",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z",
      "deletedAt": null
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 0
}
```

実装メモ:
- `teamId` は必須
- `status` を省略した場合、`Deleted` は除外される
- `includeDeleted=true` を付けると `Deleted` も対象に含める

Errors: `400`, `500`

### 5.9 GET /requests/:id
Request詳細を取得する。

Response `200`:
```json
{
  "id": "uuid",
  "teamId": "team-1",
  "title": "稟議: ノートPC購入",
  "body": "業務用端末の更新申請",
  "status": "Draft",
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z",
  "deletedAt": null
}
```

Errors: `400`, `404`, `500`

## 6. 状態遷移APIマッピング
- `submit` : Draftのみ許可
- `approve/reject` : Pendingのみ許可
- `revise` : Rejectedのみ許可
- `delete` : Draft/Rejectedのみ許可
- `update` : Draftのみ許可
- 終端（Approved/Deleted）は変更系操作をすべて409で拒否

## 7. トランザクション要件
- `/approve` と `/reject`:
  - `requests.status` 更新
  - `approvals` 追加
  - 上記を同一トランザクションで実行
- `/delete`:
  - `status=Deleted`
  - `deletedAt` 設定
  - 上記を同一トランザクションで実行

## 8. 監査ログ要件（API起点）
変更系APIでは次をログ記録する:
- `requestId`
- `teamId`
- `actorId`
- `action`
- `timestamp`

## 9. 関連ドキュメント
- [PRD.md](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
- [NFR.md](/Users/admin/WebPortfolio/MiniFlow/docs/NFR.md)
- [ERD.md](/Users/admin/WebPortfolio/MiniFlow/docs/ERD.md)
- [IMPLEMENTATION_GUIDE.md](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
