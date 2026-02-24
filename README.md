# MiniFlow

小規模組織向けの **承認ワークフロー** を題材にした、TypeScript 学習兼ポートフォリオ用プロジェクトです。
「口頭承認で証跡が残らない」課題を、最小構成の承認フローで解決することを目指します。

---

## 1. このREADMEの狙い

このリポジトリは、以下を採用担当者に伝わる形で示すために設計しています。

- ドメイン理解（業務課題をどう分解したか）
- 設計力（制約下でのトレードオフ判断）
- TypeScript での一貫した実装方針
- 将来拡張を見据えた設計（多段階承認への布石）

---

## 2. 背景と問題設定

### 背景
- 口頭・チャット中心の承認では、意思決定の証跡が残りにくい
- 後から「誰が・いつ・何を承認したか」を追跡しづらい

### 解決したい問題
- 承認履歴をシステム上で一貫して保持し、トラブル原因を減らす

### 対象ユーザー
- 小規模組織（まずは運用を回せる最小機能に集中）

---

## 3. スコープ（MVP）

### 実装対象（1段階承認）
- 申請作成 / 更新 / 提出
- 承認 / 却下 / 再提出
- チーム作成
- メンバー登録
- メンバーのチームアサイン
- 承認者の割り当て
- 申請一覧取得・検索
- ステータス遷移の検証

### 非対象（現時点）
- 多段階承認
- 全員承認制
- 外部ワークフローサービス連携

---

## 4. 設計方針

### アーキテクチャ方針
- 小規模運用・整合性重視のため、**モノリス構成**を採用
- フロントエンド / バックエンドを分離しつつ API で接続
- TypeScript 前提で、将来的に型共有（DTO / APIレスポンス）を行う

### トレードオフ
- 実装コストを抑えるため、承認は単一承認に限定
- 代わりに、状態遷移とトランザクション境界を明確化

---

## 5. ドメインモデル

### ドメイン定義
- 「意思決定の正当性を、履歴付きで担保する承認業務」

### Aggregate 境界
- Aggregate Root: `Request`
- `Approval` は `Request` に従属する内部エンティティ
- `Approval` は追加のみ（履歴として immutable）

### Request Aggregate が保証する整合性
- 状態遷移の正当性
- Approval 履歴の不変性
- 重複承認の排除
- 承認資格チェックの強制

### ドメインサービス
- `承認者資格の判定`
  - 例: 承認者が上長かどうか
  - 理由: Request 単体では完結しない外部コンテキスト（組織構造）に依存するため

---

## 6. 不変条件

### Approval 単体
- 必須項目: `id`, `actorId`, `type`, `actedAt`
- 生成後は変更不可

### Approval 追加時
- `Pending` のときのみ追加可能
- 同一人物の重複承認は禁止
- 承認資格を持つこと
- Approved状態ではApproveが1件存在する
- rejected状態ではRejectが1件以上存在する

*** Requestの不変条件：
- Draft以外では内容変更不可
- Pending以外ではapprove/reject不可
-  Approved/Deletedは終端状態
-  Approvalは追加のみで変更不可
-  Approval追加はPendingのみ

** 状態遷移
** ステータス定義
Request.status は最新のApprovalにより決定される
（DraftとDeletedは例外的内部状態）
Draft
Pending
Approved
Rejected
Deleted

*** 状態遷移図
Draft
└ update() → Draft
└ submit() → Pending
└ delete() → Deleted

Pending
└ approve() → Approved
└ reject() → Rejected

Rejected
└ revise() → Draft
└ delete() → Deleted

Approved → 終端
Deleted → 終端

*** Requestの操作
create
 許可状態特になし
update
 許可状態draftのみ（所謂下書き）
submit
 許可状態 Draftのみ
approve
 許可状態 Pendingのみ
reject
 許可状態 Pendingのみ
revise
 許可状態 Rejectedのみ
delete
 許可状態 DraftとRejectedのみ
## 設計判断の根拠（代替案との比較）
### なぜ Approval を Request の内部エンティティにしたか
- 採用案（内部エンティティ）
  - 1回の承認操作で「重複承認防止・承認資格チェック・状態遷移・履歴追加」を同一トランザクションで完結できる。
  - 「Approval は Request なしでは成立しない」というライフサイクル従属性をそのままモデル化できる。
- 代替案（Approval を別 Aggregate）
  - 利点: 承認履歴の大量化へのスケール、承認監査の独立管理、将来のイベント駆動化に適合しやすい。
  - 欠点: Request と Approval の整合性が分散し、最終整合や補償処理が必要になる。
- 現時点の判断
  - 対象が小規模組織かつ単一承認のため、整合性を優先して内部エンティティを採用。
  - ただし監査要件増大・高頻度アクセス・履歴肥大化が発生した時点で分離を再評価する。

### なぜ status を保持するか（派生値を保存する理由）
- status は Approval 履歴から理論上は導出可能だが、実装では保持する。
- 理由
  - 一覧検索や集計のクエリを単純化し、読み取り性能を安定させる。
  - API 応答で状態解釈ロジックを重複させない。
- 一貫性維持の方針
  - status 更新は Approval 追加と同一トランザクションでのみ実行する。
  - バッチや手動更新での status 直接更新は禁止する。

## 拡張時の破壊点（requiredApprovalCount 導入）
現行モデルは「承認1件で Approved」を前提としているため、以下が破壊点になる。

1. `approve()` の完了条件
- 現行: 承認1件で即 Approved。
- 拡張後: `承認数 >= requiredApprovalCount` を満たすまで Pending を維持する必要がある。

2. status 決定ロジック
- 現行: 最新 Approval を見ればよい。
- 拡張後: Approval 集合（承認数・却下数・承認順序）からの評価に変更が必要。

3. 不変条件
- 現行: Approved なら Approve が1件存在。
- 拡張後: Approved なら `Approve件数 >= requiredApprovalCount` に置換。

4. 承認方式の選択
- 並列承認か逐次承認かでルールが変わるため、`ApprovalPolicy`（例: Sequential / Parallel）の導入が必要。

## 今後の移行方針
- 短期: 現行設計のまま実装完成度（テスト、Repository、エラー設計）を優先する。
- 中期: requiredApprovalCount と ApprovalPolicy を Value Object 化し、`approve()` 判定をポリシーに委譲する。
- 長期: 監査・検索要件が増大した場合、Approval を別 Aggregate / イベントストア化する。
