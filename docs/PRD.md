# PRD: MiniFlow (v0.1)

## 1. ドキュメント目的
MiniFlowのMVP開発における、プロダクト要件（何を作るか）を定義する。  
本PRDは実装判断の基準であり、設計・実装の差分は本書に先に反映する。

## 2. 背景と課題
- 口頭承認やチャット口頭合意により、意思決定の証跡が残らない
- 承認状態が可視化されず、進捗確認コストが高い
- 後追い監査時に「誰が・いつ・何を承認/却下したか」の確認が難しい

## 3. ターゲットユーザー
- 小規模組織（少人数チーム）
- 想定ロール:
  - 申請者（Request作成・提出）
  - 承認者（approve/reject）
  - 閲覧者（一覧/詳細確認）

## 4. プロダクトゴール
- 申請と承認の流れを一元化し、状態を可視化する
- 承認/却下の履歴を保存し、最低限の監査可能性を担保する
- MVPとして実装を小さく保ち、後続拡張（多段承認）へ繋げる

## 5. MVPスコープ
### 5.1 In Scope
- Request作成（Draft）
- Request更新（Draftのみ）
- submitによる提出（Draft -> Pending）
- approve/reject（Pendingのみ）
- revise（Rejected -> Draft、同一Requestを戻す）
- delete（Draft/Rejectedのみ、論理削除）
- Request検索（最低限: teamId, status, createdAt）
- Request詳細取得（Approval履歴を含む）

### 5.2 Out of Scope
- 多段承認、全員承認、承認経路分岐
- 通知/リマインド
- 権限の多階層化
- Deleted復旧機能
- revise実行履歴の専用イベント化（MVPでは未対応）

## 6. ユースケース
1. 申請者がDraftを作成し、内容を編集してsubmitする
2. 承認者がPendingをapproveする
3. 承認者がPendingをrejectし、申請者がreviseして再提出する
4. 利用者がstatus条件で一覧検索する
5. 利用者が詳細画面でApproval履歴を確認する

## 7. 機能要件（Functional Requirements）
- FR-01: ユーザーはDraft Requestを作成できる
- FR-02: ユーザーはDraft Requestのみ更新できる
- FR-03: ユーザーはDraft Requestをsubmitできる
- FR-04: 承認者はPending Requestをapproveできる
- FR-05: 承認者はPending Requestをrejectできる
- FR-06: 申請者はRejected RequestをreviseでDraftに戻せる
- FR-07: ユーザーはDraft/Rejected Requestをdeleteできる（論理削除）
- FR-08: ユーザーはRequest一覧を検索できる
- FR-09: ユーザーはRequest詳細とApproval履歴を閲覧できる
- FR-10: システムは不正遷移を409として拒否する

## 8. ドメイン制約（プロダクトレベル）
- `Request.status` は source of truth
- `Approval` は履歴（insert only）
- `Approved` / `Deleted` は終端状態
- approve/reject時は `status更新 + Approval追加` を同一Txで実行
- `delete` は `status=Deleted` と `deleted_at` を同時更新

## 9. 成功指標（MVP）
- M1: 主要フロー（作成→提出→承認/却下→再提出）が一通り実行できる
- M2: 状態遷移テスト（T01-T23）で主要遷移が担保される
- M3: 一覧検索で `status/teamId/createdAt` 条件が利用できる
- M4: 承認履歴が詳細画面で確認できる

## 10. 受け入れ基準（Acceptance Criteria）
- AC-01: Draft以外でupdateすると409
- AC-02: Pending以外でapprove/rejectすると409
- AC-03: Rejected以外でreviseすると409
- AC-04: Draft/Rejected以外でdeleteすると409
- AC-05: approve/reject成功時にApprovalが1件追加される
- AC-06: reject後にreviseするとDraftへ戻る（Approval追加なし）
- AC-07: Deletedは一覧でデフォルト非表示とする（明示指定時のみ表示）

## 11. 技術スタック（固定）
- Frontend: Next.js (React + TypeScript)
- Backend: NestJS (TypeScript)
- Database: PostgreSQL

## 12. 関連ドキュメント
- [README.md](/Users/admin/WebPortfolio/MiniFlow/README.md)
- [IMPLEMENTATION_GUIDE.md](/Users/admin/WebPortfolio/MiniFlow/docs/IMPLEMENTATION_GUIDE.md)
