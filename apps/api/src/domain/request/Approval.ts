export type ApprovalActionType = "Approved" | "Rejected";

/**
 * Approval records the audit trail for approve/reject only. If revise/delete
 * later become audited events, add a separate event model instead of widening this one.
 */
export class Approval {
  readonly id: string;
  readonly requestId: string;
  readonly actedBy: string;
  readonly actionType: ApprovalActionType;
  readonly reason: string | null;
  readonly createdAt: Date;

  constructor(params: {
    id: string;
    requestId: string;
    actedBy: string;
    actionType: ApprovalActionType;
    reason?: string | null;
    createdAt?: Date;
  }) {
    this.id = params.id;
    this.requestId = params.requestId;
    this.actedBy = params.actedBy;
    this.actionType = params.actionType;
    this.reason = params.reason ?? null;
    this.createdAt = params.createdAt ?? new Date();
  }
}
