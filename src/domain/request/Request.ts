import { DomainError } from "../errors/DomainError";
import type { ApproverPolicy } from "../policies/ApproverPolicy";
import { Approval } from "./Approval";
import type { Status } from "./Status";

export class Request {
  readonly id: string;
  readonly teamId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  updatedAt: Date;
  status: Status;
  title: string;
  body: string;
  deletedAt: Date | null;
  readonly approvals: Approval[];

  constructor(params?: {
    id?: string;
    teamId?: string;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    status?: Status;
    title?: string;
    body?: string;
    deletedAt?: Date | null;
    approvals?: Approval[];
  }) {
    this.id = params?.id ?? "req-1";
    this.teamId = params?.teamId ?? "team-1";
    this.createdBy = params?.createdBy ?? "user-1";
    this.createdAt = params?.createdAt ?? new Date();
    this.updatedAt = params?.updatedAt ?? this.createdAt;
    this.status = params?.status ?? "Draft";
    this.title = params?.title ?? "title";
    this.body = params?.body ?? "body";
    this.deletedAt = params?.deletedAt ?? null;
    this.approvals = params?.approvals ?? [];

    this.assertInvariants();
  }

  submit(): void {
    this.assertStatus("Draft", "submit is only allowed in Draft");
    this.status = "Pending";
    this.touch();
    this.assertInvariants();
  }

  update(input: { title?: string; body?: string }): void {
    this.assertStatus("Draft", "update is only allowed in Draft");
    if (typeof input.title === "string") {
      this.title = input.title;
    }
    if (typeof input.body === "string") {
      this.body = input.body;
    }
    this.touch();
    this.assertInvariants();
  }

  approve(actorId: string, policy: ApproverPolicy, reason?: string): void {
    this.assertStatus("Pending", "approve is only allowed in Pending");
    if (!policy.canApprove(this, actorId)) {
      throw new DomainError("forbidden", 403, "FORBIDDEN");
    }
    this.assertNoDuplicateDecision(actorId);

    this.approvals.push(
      new Approval({
        requestId: this.id,
        actedBy: actorId,
        actionType: "Approved",
        reason
      })
    );
    this.status = "Approved";
    this.touch();
    this.assertInvariants();
  }

  reject(actorId: string, policy: ApproverPolicy, reason?: string): void {
    this.assertStatus("Pending", "reject is only allowed in Pending");
    if (!policy.canReject(this, actorId)) {
      throw new DomainError("forbidden", 403, "FORBIDDEN");
    }
    this.assertNoDuplicateDecision(actorId);

    this.approvals.push(
      new Approval({
        requestId: this.id,
        actedBy: actorId,
        actionType: "Rejected",
        reason
      })
    );
    this.status = "Rejected";
    this.touch();
    this.assertInvariants();
  }

  revise(_actorId: string): void {
    this.assertStatus("Rejected", "revise is only allowed in Rejected");
    this.status = "Draft";
    this.touch();
    this.assertInvariants();
  }

  delete(_actorId: string): void {
    if (!(this.status === "Draft" || this.status === "Rejected")) {
      throw new DomainError("delete is only allowed in Draft/Rejected", 409, "STATE_CONFLICT");
    }
    this.status = "Deleted";
    this.deletedAt = new Date();
    this.touch();
    this.assertInvariants();
  }

  private assertStatus(expected: Status, message: string): void {
    if (this.status !== expected) {
      throw new DomainError(message, 409, "STATE_CONFLICT");
    }
  }

  private assertNoDuplicateDecision(actorId: string): void {
    const hasDecision = this.approvals.some((approval) => approval.actedBy === actorId);
    if (hasDecision) {
      throw new DomainError("duplicate decision", 409, "STATE_CONFLICT");
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private assertInvariants(): void {
    const deletedByStatus = this.status === "Deleted";
    const deletedByTimestamp = this.deletedAt !== null;
    if (deletedByStatus !== deletedByTimestamp) {
      throw new DomainError("invalid deleted state", 409, "STATE_CONFLICT");
    }

    if (this.status === "Approved") {
      const hasApproved = this.approvals.some((approval) => approval.actionType === "Approved");
      if (!hasApproved) {
        throw new DomainError("approved status requires approval record", 409, "STATE_CONFLICT");
      }
    }

    if (this.status === "Rejected") {
      const hasRejected = this.approvals.some((approval) => approval.actionType === "Rejected");
      if (!hasRejected) {
        throw new DomainError("rejected status requires reject record", 409, "STATE_CONFLICT");
      }
    }
  }
}
