# OpenAPIの見方（最短）

## 1. どこを見るか
- `paths`: APIのURL一覧
- `components/schemas`: 型定義（Request, Approval など）
- `responses`: エラー形式の共通定義

## 2. 1つのAPIを読む順番
例: `/requests/{id}/approve`
1. `paths./requests/{id}/approve.post.summary` で目的を見る
2. `parameters` で必要ヘッダ/パスを確認する
3. `requestBody` で入力JSONを確認する
4. `responses.200` で成功レスポンスを確認する
5. `responses.403/404/409` で失敗条件を確認する

## 3. 今回いちばん重要な部分
- 状態遷移ルール
  - `submit`: Draftのみ
  - `approve/reject`: Pendingのみ
  - `revise`: Rejectedのみ
  - `delete`: Draft/Rejectedのみ
- 失敗時は主に `409`
- 一覧は `includeDeleted=false` がデフォルト

## 4. YAMLを直接読まなくてよくする方法
TypeScript型を自動生成して、コード側から使う。

```bash
npm run openapi:types
```

生成先:
- `src/shared/api-types.ts`

## 5. 生成型の使い方（例）
```ts
import type { components, paths } from "../shared/api-types";

type RequestDto = components["schemas"]["Request"];
type ApproveResponse =
  paths["/requests/{id}/approve"]["post"]["responses"]["200"]["content"]["application/json"];
```

この方法だと、API仕様変更時に型エラーでズレを検知できる。
