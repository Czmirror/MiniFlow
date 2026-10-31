/** 申請の状態と本人に対応する既存操作を表示する。通信・更新の排他は親が担当する。 */
import React from "react";
import type { AuthUserDto, RequestDto, UserRole } from "@miniflow/shared";
import type { Labels } from "../lib/messages";
import type { RequestEditForm } from "../lib/requestEditor";

/** 既存の表示条件を保ち、実行イベントを親へ返す。サーバーの認可は代替しない。 */
export function RequestDetailActions({ labels, request, currentUser, loading, editForm, decisionReason, onSubmitRequest, onReviseRequest, onDecision, onDecisionReasonChange }: {
  labels: Labels; request: RequestDto; currentUser: AuthUserDto; loading: boolean; editForm: RequestEditForm; decisionReason: string;
  onSubmitRequest: (input?: RequestEditForm) => void; onReviseRequest: () => void;
  onDecision: (action: "approve" | "reject") => void; onDecisionReasonChange: (reason: string) => void;
}) {
  const isOwnRequest = request.createdBy === currentUser.id;
  const canSubmit = request.status === "Draft" && (isOwnRequest || currentUser.role === "Admin");
  const canEdit = request.status === "Draft" && (isOwnRequest || currentUser.role === "Admin");
  const canRevise = request.status === "Rejected" && (isOwnRequest || currentUser.role === "Admin");
  const canDecide =
    request.status === "Pending" &&
    !isOwnRequest &&
    (currentUser.role === "Approver" || currentUser.role === "Admin");

  return <section className="detail-actions" aria-label={labels.nextAction}>
    <h3>{labels.nextAction}</h3>
        {canSubmit ? (
          <aside className="decision-panel">
            <h4>{labels.submitRequest}</h4>
            <p>{labels.draftSubmitHelp}</p>
            <button
              className="button primary"
              type="button"
              disabled={loading}
              onClick={() => void onSubmitRequest(canEdit ? editForm : undefined)}
            >
              {loading ? labels.submittingRequest : labels.submitRequest}
            </button>
          </aside>
        ) : canRevise ? (
          <aside className="decision-panel">
            <h4>{labels.reviseRequest}</h4>
            <p>{labels.rejectedReviseHelp}</p>
            <button className="button primary" type="button" disabled={loading} onClick={() => void onReviseRequest()}>
              {loading ? labels.revisingRequest : labels.reviseRequest}
            </button>
          </aside>
        ) : canDecide ? (
          <aside className="decision-panel">
            <h4>{labels.approval}</h4>
            <label className="field">
              <span>{labels.reason}</span>
              <textarea
                disabled={loading}
                rows={5}
                value={decisionReason}
                onChange={(event) => onDecisionReasonChange(event.target.value)}
              />
            </label>
            <div className="decision-actions">
              <button
                className="button approve"
                type="button"
                disabled={loading}
                onClick={() => void onDecision("approve")}
              >
                {labels.approve}
              </button>
              <button
                className="button reject"
                type="button"
                disabled={loading}
                onClick={() => void onDecision("reject")}
              >
                {labels.reject}
              </button>
            </div>
          </aside>
        ) : (
          <aside className="decision-panel muted">
            <h4>{labels.approval}</h4>
            <p>{approvalUnavailableMessage(request.status, isOwnRequest, currentUser.role, labels)}</p>
          </aside>
        )}
  </section>;
}

function approvalUnavailableMessage(status: RequestDto["status"], isOwnRequest: boolean, role: UserRole, labels: Labels) {
  if (status === "Pending" && role === "Applicant") {
    return labels.pendingApprovalHelp;
  }
  if (status !== "Pending") {
    return labels.approvalAvailableAfterSubmit;
  }

  if (isOwnRequest) {
    return labels.ownRequestApprovalHidden;
  }

  return labels.approvalUnavailable;
}
