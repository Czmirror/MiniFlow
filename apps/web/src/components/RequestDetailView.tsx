/** 選択申請の読み順を組み立てる。編集値・取得状態・操作の寿命は呼び出し元が持つ。 */
import React from "react";
import type { ApprovalDto, AuthUserDto, RequestDto } from "@miniflow/shared";
import type { Labels } from "../lib/messages";
import type { RequestEditForm } from "../lib/requestEditor";
import { requestDetailPresentation } from "../lib/requestDetailPresentation";
import { formatDate } from "../lib/displayFormat";
import { canDeleteRequest } from "../lib/canDeleteRequest";
import { RequestDeleteAction } from "./RequestDeleteAction";
import { StatusBadge } from "./StatusBadge";
import { RequestDetailActions } from "./RequestDetailActions";
import { RequestApprovalHistory } from "./RequestApprovalHistory";

/** 現在の申請だけを描画する。取得中・失敗・未選択を成功表示から分ける。 */
export function RequestDetailView(props: {
  labels: Labels; approvals: ApprovalDto[]; currentUser: AuthUserDto; decisionReason: string; loading: boolean;
  request: RequestDto | null; detailLoading?: boolean; detailFailed?: boolean; onRetry?: () => void;
  onBack: () => void; onDelete: () => void; onDecision: (action: "approve" | "reject") => void;
  onDecisionReasonChange: (reason: string) => void; onReviseRequest: () => void;
  onSubmitRequest: (input?: RequestEditForm) => void; onUpdateRequest: (input: RequestEditForm) => void;
  editForm: RequestEditForm; onEditChange: (form: RequestEditForm) => void;
}) {
  const { labels, request, approvals, currentUser, loading, editForm, onEditChange, onUpdateRequest, onBack, onDelete } = props;
  if (props.detailLoading || props.detailFailed || !request) {
    return <section className="detail-state stack" aria-busy={props.detailLoading || undefined}>
      <p role={props.detailFailed ? "alert" : "status"}>{props.detailLoading ? labels.detailLoading : props.detailFailed ? labels.detailLoadFailed : labels.noSelectedRequest}</p>
      <div className="form-actions">
        {props.detailFailed && props.onRetry ? <button className="button secondary" type="button" onClick={props.onRetry}>{labels.retry}</button> : null}
        <button className="button quiet" type="button" disabled={loading} onClick={onBack}>{labels.back}</button>
      </div>
    </section>;
  }
  const { history, rejection } = requestDetailPresentation(request.status, approvals);
  const canEdit = request.status === "Draft" && (request.createdBy === currentUser.id || currentUser.role === "Admin");
  return <div className="screen-grid request-detail">
    <section className="detail-header">
      <div><p className="eyebrow">{labels.requestDetail}</p><h2>{request.title}</h2><p className="detail-help">{labels.detailHelp}</p><span className="detail-id">{request.id}</span></div>
      <StatusBadge labels={labels} status={request.status} />
    </section>
    {rejection ? <section className="rejection-summary" aria-label={labels.rejectionReason}>
      <h3>{labels.rejectionReason}</h3><p>{rejection.reason || labels.noReason}</p>
    </section> : null}
    <section className="detail-layout">
      <div className="detail-main">
          {canEdit ? (
            <div className="stack">
              <label className="field">
                <span>{labels.title}</span>
                <input
                  disabled={loading}
                  value={editForm.title}
                  onChange={(event) => onEditChange({ ...editForm, title: event.target.value })}
                />
              </label>
              <label className="field">
                <span>{labels.body}</span>
                <textarea
                  disabled={loading}
                  rows={7}
                  value={editForm.body}
                  onChange={(event) => onEditChange({ ...editForm, body: event.target.value })}
                />
              </label>
              <button
                className="button secondary"
                type="button"
                disabled={loading}
                onClick={() => void onUpdateRequest(editForm)}
              >
                {labels.saveChanges}
              </button>
            </div>
          ) : (
            <div className="field-read">
              <span>{labels.body}</span>
              <p>{request.body}</p>
            </div>
          )}
          <div className="meta-grid">
            <Meta label={labels.team} value={request.teamId} />
            <Meta label={labels.requester} value={request.createdBy} />
            <Meta label={labels.created} value={formatDate(request.createdAt)} />
            <Meta label={labels.updated} value={formatDate(request.updatedAt)} />
          </div>
      </div>
      <RequestDetailActions {...props} request={request} />
    </section>
    <RequestApprovalHistory labels={labels} history={history} />
    <footer className="detail-footer">
      <button className="button quiet" type="button" disabled={loading} onClick={onBack}>{labels.back}</button>
      {canDeleteRequest(request, currentUser) ? <RequestDeleteAction title={request.title} labels={labels} disabled={loading} onConfirm={onDelete} /> : null}
    </footer>
  </div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
