# NFR: MiniFlow (v0.1)

## 1. ドキュメント目的
MiniFlowのMVPで満たすべき非機能要件（品質要件）を定義する。  
実装前に品質目標を明確化し、設計・テストの判断基準にする。

## 2. 前提
- 対象は小規模組織向けMVP
- 技術スタック: Next.js / NestJS / PostgreSQL
- 高可用構成や大規模分散はMVPの対象外

## 3. 性能要件
### 3.1 API応答目標（通常時）
- 一覧API: p95 500ms以内（フィルタ条件あり）
- 詳細API: p95 300ms以内
- 状態変更API（submit/approve/reject/revise/delete）: p95 400ms以内

### 3.2 同時利用（MVP想定）
- 同時アクティブユーザー: 20程度
- 同時リクエスト: 10 req/s 程度を劣化なく処理

### 3.3 クエリ方針
- `requests` は `status`, `team_id`, `created_at` を主検索軸にインデックスを設計
- Approval履歴は `request_id`, `created_at` で取得最適化

## 4. 可用性・運用性
- 目標稼働率: 99.5%（MVP）
- 障害時は手動復旧を許容（自動フェイルオーバーは対象外）
- APIのヘルスチェックエンドポイントを用意（`/health`）

## 5. 整合性・トランザクション
- `approve/reject` は `status更新 + approval追加` を同一トランザクションで実行
- `delete` は `status=Deleted` と `deleted_at` を同一トランザクションで更新
- 整合ルール:
  - `status = Deleted <=> deleted_at IS NOT NULL`
  - `status != Deleted <=> deleted_at IS NULL`

## 6. セキュリティ要件
### 6.1 認可
- approve/rejectは `ApproverPolicy` を必須通過
- 未権限操作は403で返却

### 6.2 入力バリデーション
- API入力はDTOで型・必須・長さを検証
- 不正入力は400で返却

### 6.3 データ保護
- 通信はHTTPS前提
- 機密情報（パスワード等）は本MVPでは扱わない想定

## 7. 監査性・トレーサビリティ
- Approvalはinsert onlyで履歴保持
- Requestの状態変更はログで追跡可能にする
- 最低限記録する監査項目:
  - requestId
  - teamId
  - actorId
  - action
  - timestamp

## 8. エラーハンドリング
- エラー分類を統一:
  - 400: 入力不正
  - 403: 権限不足
  - 404: リソース不存在
  - 409: 状態不整合（Precondition違反）
  - 500: 予期しない内部エラー
- エラーレスポンスは一貫フォーマットで返却

## 9. テスト品質要件
- Domainテストで遷移表T01-T23をカバー
- Applicationテストでユースケース成功/失敗を検証
- 最低限の結合テストで主要API（submit, approve, reject）を検証
- CIで `npm test` を必須化

## 10. 保守性要件
- レイヤ依存は `presentation -> application -> domain` を維持
- domain層は外部IOに依存しない
- TypeScript strict modeを有効
- 命名とエラーコードの一貫性を維持

## 11. 観測性要件（MVP）
- 構造化ログ（JSON）で出力
- 重要イベント（submit/approve/reject/revise/delete）をINFOログ記録
- エラー時はrequestId付きで出力

## 12. 制約・既知の非対応
- 多段承認の性能要件は未定義（MVP外）
- revise実行履歴の専用イベント（Revised）は未対応
- Deleted復旧ユースケースは未対応

## 13. 関連ドキュメント
- [README.md](/Users/admin/WebPortfolio/MiniFlow/README.md)
- [IMPLEMENTATION_GUIDE.md](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
- [PRD.md](/Users/admin/WebPortfolio/MiniFlow/docs/PRD.md)
