/** 詳細の決定履歴を古い順の入力で描画する。記録にない出来事・氏名は補わない。 */
import React from "react";
import type { ApprovalDto } from "@miniflow/shared";
import type { Labels } from "../lib/messages";
import { formatDate, shortId } from "../lib/displayFormat";
import { StatusBadge } from "./StatusBadge";

/** 表示モデルで整列した履歴を表示する。自由文はReactのtextとして扱う。 */
export function RequestApprovalHistory({ labels, history }: { labels: Labels; history: readonly ApprovalDto[] }) {
  return <section aria-label={labels.approvalHistory}>
    <div className="section-heading"><h3>{labels.approvalHistory}</h3><span className="detail-help">{labels.historyOrder}</span></div>
    {history.length ? <ol className="history-list">
      {history.map(approval => <li className="history-item" key={approval.id}>
        <StatusBadge labels={labels} status={approval.actionType === "Approved" ? "Approved" : "Rejected"} />
        <div><strong>{shortId(approval.actedBy)}</strong><p>{approval.reason || labels.noReason}</p></div>
        <time dateTime={Number.isFinite(Date.parse(approval.createdAt)) ? approval.createdAt : undefined}>{formatDate(approval.createdAt)}</time>
      </li>)}
    </ol> : <div className="empty-state"><p>{labels.noApprovalHistory}</p><p>{labels.historyEmptyHelp}</p></div>}
  </section>;
}
