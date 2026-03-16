import type { Status } from "./Status.js";
import { StateConflictError } from "../../application/errors/StateConflictError.js";
import { Approval } from "./Approval.js";

/**
 * Request is kept immutable in the API layer so state transitions stay explicit
 * when persistence and HTTP concerns expand. If later endpoints add approvals or
 * delete/revise flows, update these factory-style methods together with the docs.
 */
export class Request {
  readonly id: string;
  readonly teamId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly title: string;
  readonly body: string;
  readonly status: Status;
  readonly approvals: Approval[];

  private constructor(params: {
    id: string;
    teamId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    body: string;
    status: Status;
    approvals: Approval[];
  }) {
    this.id = params.id;
    this.teamId = params.teamId;
    this.createdBy = params.createdBy;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.deletedAt = params.deletedAt;
    this.title = params.title;
    this.body = params.body;
    this.status = params.status;
    this.approvals = params.approvals;

    this.assertInvariants();
  }

  static createDraft(params: {
    id: string;
    teamId: string;
    createdBy: string;
    title: string;
    body: string;
    now?: Date;
  }): Request {
    const timestamp = params.now ?? new Date();

    return new Request({
      id: params.id,
      teamId: params.teamId,
      createdBy: params.createdBy,
      title: params.title,
      body: params.body,
      status: "Draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      approvals: []
    });
  }

  static rehydrate(params: {
    id: string;
    teamId: string;
    createdBy: string;
    title: string;
    body: string;
    status: Status;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    approvals?: Approval[];
  }): Request {
    return new Request({
      ...params,
      approvals: params.approvals ?? []
    });
  }

  /**
   * Draft updates are limited to editable fields. When additional fields become
   * user-editable, extend this method instead of patching route-level DTO logic.
   */
  update(input: { title?: string; body?: string; now?: Date }): Request {
    this.assertStatus("Draft", "update is only allowed in Draft");

    return new Request({
      id: this.id,
      teamId: this.teamId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: input.now ?? new Date(),
      deletedAt: this.deletedAt,
      title: typeof input.title === "string" ? input.title.trim() : this.title,
      body: typeof input.body === "string" ? input.body.trim() : this.body,
      status: this.status,
      approvals: this.approvals
    });
  }

  /**
   * Single-step submit keeps the MVP state machine small. Multi-step approvals
   * should change this transition in domain first, not in the HTTP layer.
   */
  submit(now?: Date): Request {
    this.assertStatus("Draft", "submit is only allowed in Draft");

    return new Request({
      id: this.id,
      teamId: this.teamId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: now ?? new Date(),
      deletedAt: this.deletedAt,
      title: this.title,
      body: this.body,
      status: "Pending",
      approvals: this.approvals
    });
  }

  /**
   * Approve/reject append audit history and finalize the current round. If the
   * approval model becomes multi-step, change both the status transition and
   * the invariant rules here before touching HTTP or repository code.
   */
  approve(input: { actorId: string; approvalId: string; reason?: string; now?: Date }): {
    request: Request;
    approval: Approval;
  } {
    this.assertStatus("Pending", "approve is only allowed in Pending");

    const approval = new Approval({
      id: input.approvalId,
      requestId: this.id,
      actedBy: input.actorId,
      actionType: "Approved",
      reason: input.reason,
      createdAt: input.now
    });

    return {
      approval,
      request: new Request({
        id: this.id,
        teamId: this.teamId,
        createdBy: this.createdBy,
        createdAt: this.createdAt,
        updatedAt: input.now ?? new Date(),
        deletedAt: this.deletedAt,
        title: this.title,
        body: this.body,
        status: "Approved",
        approvals: [...this.approvals, approval]
      })
    };
  }

  reject(input: { actorId: string; approvalId: string; reason?: string; now?: Date }): {
    request: Request;
    approval: Approval;
  } {
    this.assertStatus("Pending", "reject is only allowed in Pending");

    const approval = new Approval({
      id: input.approvalId,
      requestId: this.id,
      actedBy: input.actorId,
      actionType: "Rejected",
      reason: input.reason,
      createdAt: input.now
    });

    return {
      approval,
      request: new Request({
        id: this.id,
        teamId: this.teamId,
        createdBy: this.createdBy,
        createdAt: this.createdAt,
        updatedAt: input.now ?? new Date(),
        deletedAt: this.deletedAt,
        title: this.title,
        body: this.body,
        status: "Rejected",
        approvals: [...this.approvals, approval]
      })
    };
  }

  /**
   * revise keeps prior rejection history on the same request for MVP auditability.
   * If versioned resubmission is introduced later, this is the method to replace.
   */
  revise(input?: { now?: Date }): Request {
    this.assertStatus("Rejected", "revise is only allowed in Rejected");

    return new Request({
      id: this.id,
      teamId: this.teamId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: input?.now ?? new Date(),
      deletedAt: null,
      title: this.title,
      body: this.body,
      status: "Draft",
      approvals: this.approvals
    });
  }

  /**
   * delete is logical only. If physical deletion is ever introduced, keep this
   * method as the domain rule for whether deletion is allowed.
   */
  delete(input?: { now?: Date }): Request {
    if (this.status !== "Draft" && this.status !== "Rejected") {
      throw new StateConflictError("delete is only allowed in Draft/Rejected");
    }

    return new Request({
      id: this.id,
      teamId: this.teamId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: input?.now ?? new Date(),
      deletedAt: input?.now ?? new Date(),
      title: this.title,
      body: this.body,
      status: "Deleted",
      approvals: this.approvals
    });
  }

  private assertInvariants(): void {
    if (this.title.trim().length === 0) {
      throw new Error("title must not be empty");
    }

    if (this.body.trim().length === 0) {
      throw new Error("body must not be empty");
    }

    if (this.teamId.trim().length === 0) {
      throw new Error("teamId must not be empty");
    }

    const deletedByStatus = this.status === "Deleted";
    const deletedByTimestamp = this.deletedAt !== null;
    if (deletedByStatus !== deletedByTimestamp) {
      throw new Error("deleted status and deletedAt must stay in sync");
    }

    const approvedCount = this.approvals.filter((approval) => approval.actionType === "Approved").length;
    const rejectedCount = this.approvals.filter((approval) => approval.actionType === "Rejected").length;

    if (this.status === "Approved") {
      if (approvedCount !== 1) {
        throw new Error("approved status requires exactly one approved record");
      }
    } else if (approvedCount !== 0) {
      throw new Error("non-approved status cannot contain approved records");
    }

    if (this.status === "Rejected" && rejectedCount < 1) {
      throw new Error("rejected status requires at least one rejected record");
    }
  }

  private assertStatus(expected: Status, message: string): void {
    if (this.status !== expected) {
      throw new StateConflictError(message);
    }
  }
}
