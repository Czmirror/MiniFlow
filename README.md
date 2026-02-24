# MiniFlow

## 1. プロジェクト概要
MiniFlow は、小規模組織向けの承認ワークフローを対象にした TypeScript プロジェクトです。  
口頭承認のような「記録が残りにくい意思決定」を、履歴付きで検証可能な形に置き換えることを目的にしています。

## 2. 課題とMVPスコープ
### 解決したい課題
- 承認の証跡が残らないことによる認識齟齬・責任境界の曖昧化
- 承認状態の可視化不足による運用コスト増加

### MVPで含むもの
- Request の作成・更新・提出
- 承認 (`approve`) / 却下 (`reject`)
- 却下後の再提出 (`revise`)
- Request 一覧検索（例: status, teamId での絞り込み）

### MVPで含めないもの
- 多段承認、全員承認、段階別ルーティング
- 高度な通知機構
- 複雑な権限階層

## 3. ドメインモデル
### Request (Aggregate Root)
- 申請のライフサイクルと整合性を管理する主体
- `status` を保持し、状態遷移を統制する
- `Approval` 履歴を内部に持つ

### Approval (Request 内部エンティティ)
- 承認/却下の履歴イベント
- 追加のみ。生成後は不変（immutable）
- Request なしでは存在しない

### ApproverPolicy (Domain Interface)
- 承認者資格を判定する抽象
- domain 層には interface のみ置く
- 具体実装は infrastructure 層に置く

## 4. 状態遷移
### ステータス定義
`Draft`, `Pending`, `Approved`, `Rejected`, `Deleted`

`Request.status` は source of truth として保持します。  
`approve/reject` 実行時に、`Approval` 追加と `Request.status` 更新を同一トランザクションで行います。

### 状態遷移図（MVP）
- `Draft -> Draft` (`update`)
- `Draft -> Pending` (`submit`)
- `Draft -> Deleted` (`delete`)
- `Pending -> Approved` (`approve`)
- `Pending -> Rejected` (`reject`)
- `Rejected -> Draft` (`revise`)
- `Rejected -> Deleted` (`delete`)
- `Approved`, `Deleted` は終端状態

### 状態遷移表
| From | Action | To | Guard |
| --- | --- | --- | --- |
| Draft | update | Draft | Request が Deleted でないこと |
| Draft | submit | Pending | 必須入力が満たされること |
| Draft | delete | Deleted | なし |
| Pending | approve | Approved | 承認者資格あり・重複承認なし |
| Pending | reject | Rejected | 承認者資格あり |
| Rejected | revise | Draft | 同一 Request を再編集可能に戻す |
| Rejected | delete | Deleted | なし |

## 5. ドメインルール
### Invariant（常に成立すべき条件）
- `Approved` / `Deleted` は終端状態
- `Approval` は追加のみで更新・削除しない
- `Approved` の Request には `APPROVE` の Approval が 1 件以上存在する
- `Rejected` の Request には `REJECT` の Approval が 1 件以上存在する

### Precondition（操作成功の前提条件）
- `update` は `Draft` でのみ可能
- `submit` は `Draft` でのみ可能
- `approve/reject` は `Pending` でのみ可能
- `revise` は `Rejected` でのみ可能
- 同一承認者の重複承認は不可
- 承認者資格を満たさない actor は `approve/reject` 不可

## 6. アーキテクチャ方針
- レイヤ構成: `presentation -> application -> domain`
- `infrastructure` は `application/domain` の interface を実装
- ドメイン層は外部組織情報に直接依存しない
- 例外は少なくとも `DomainError` と `ApplicationError` に分離して扱う

## 7. データ整合性方針
- `Request` 更新と `Approval` 追加は同一トランザクション境界
- `approve/reject` の成否は、履歴追加と `status` 更新の原子性で保証
- 検索要件（例: status, teamId, createdAt）を想定したインデックス設計を行う

## 8. 実装の見せどころ（ポートフォリオ観点）
- Request Aggregate に状態遷移ガードと不変条件を集約
- `ApproverPolicy` を interface として分離し、境界設計を明示
- 状態遷移表とテストケースを 1:1 で対応させる
- Repository は interface を定義し、infra で実装を差し替え可能にする

## 9. テスト戦略
### Domain テスト
- 状態遷移の正常系/異常系
- Invariant 違反の拒否
- 重複承認・資格なし承認の拒否

### Application テスト
- UseCase 単位の統合的テスト（Repository/Policy は差し替え）
- エラーマッピングとユースケース境界の検証

### 主要シナリオ
1. `Pending` 以外で `approve/reject` は失敗
2. 同一承認者の重複承認は失敗
3. 承認資格なしは失敗
4. 終端状態での不正操作は失敗
5. `submit/approve/reject/revise` の正常遷移
6. 承認操作で `Approval` 追加と `status` 更新が同一 Tx 前提であること

## 10. 将来拡張とトレードオフ
### 現時点のトレードオフ
- MVPでは一段承認に限定し、実装コストを抑える
- その代わり、複雑な承認ルールは対象外

### 将来拡張
- `requiredApprovalCount` 導入
- 多段承認・全員承認への拡張
- 表示/検索要件の拡張（タグ、属性追加）
- 外部公開/API分割などシステム境界の拡張
