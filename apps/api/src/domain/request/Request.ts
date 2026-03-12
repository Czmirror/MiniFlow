import type { Status } from "./Status.js";
import { StateConflictError } from "../../application/errors/StateConflictError.js";

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
      deletedAt: null
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
  }): Request {
    return new Request(params);
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
      status: this.status
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
      status: "Pending"
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
  }

  private assertStatus(expected: Status, message: string): void {
    if (this.status !== expected) {
      throw new StateConflictError(message);
    }
  }
}
