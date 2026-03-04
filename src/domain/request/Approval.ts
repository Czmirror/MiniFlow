export type ApprovalActionType = "Approved" | "Rejected";

export class Approval {
  readonly requestId: string;
  readonly actedBy: string;
  readonly actionType: ApprovalActionType;
  readonly reason: string | null;
  readonly createdAt: Date;

  constructor(params: {
    requestId: string;
    actedBy: string;
    actionType: ApprovalActionType;
    reason?: string;
    createdAt?: Date;
  }) {
    this.requestId = params.requestId;
    this.actedBy = params.actedBy;
    this.actionType = params.actionType;
    this.reason = params.reason ?? null;
    this.createdAt = params.createdAt ?? new Date();
  }
}
