import { describe, expect, it } from "vitest";
import { DomainError } from "../../../src/domain/errors/DomainError";
import type { ApproverPolicy } from "../../../src/domain/policies/ApproverPolicy";
import { Approval } from "../../../src/domain/request/Approval";
import { Request } from "../../../src/domain/request/Request";
import type { Status } from "../../../src/domain/request/Status";

type Action = "submit" | "approve" | "reject" | "revise" | "delete" | "update";

type Case = {
  id: string;
  from: Status;
  action: Action | Action[];
  expectedStatus?: Status;
  expectedError?: 403 | 409;
  policyAllowed?: boolean;
  expectedApprovalDelta?: number;
  expectedLastActionType?: "Approved" | "Rejected";
  preseedDuplicateActor?: boolean;
};

const terminalActions: Action[] = ["submit", "approve", "reject", "revise", "delete", "update"];

const cases: Case[] = [
  { id: "T01", from: "Draft", action: "submit", expectedStatus: "Pending" },
  { id: "T02", from: "Draft", action: "delete", expectedStatus: "Deleted" },
  { id: "T03", from: "Draft", action: "approve", expectedError: 409 },
  { id: "T04", from: "Draft", action: "reject", expectedError: 409 },
  { id: "T05", from: "Draft", action: "revise", expectedError: 409 },
  { id: "T06", from: "Draft", action: "update", expectedStatus: "Draft" },
  {
    id: "T07",
    from: "Pending",
    action: "approve",
    expectedStatus: "Approved",
    expectedApprovalDelta: 1,
    expectedLastActionType: "Approved"
  },
  {
    id: "T08",
    from: "Pending",
    action: "reject",
    expectedStatus: "Rejected",
    expectedApprovalDelta: 1,
    expectedLastActionType: "Rejected"
  },
  { id: "T09", from: "Pending", action: "submit", expectedError: 409 },
  { id: "T10", from: "Pending", action: "revise", expectedError: 409 },
  { id: "T11", from: "Pending", action: "delete", expectedError: 409 },
  { id: "T12", from: "Pending", action: "update", expectedError: 409 },
  {
    id: "T13",
    from: "Rejected",
    action: "revise",
    expectedStatus: "Draft",
    expectedApprovalDelta: 0
  },
  { id: "T14", from: "Rejected", action: "delete", expectedStatus: "Deleted" },
  { id: "T15", from: "Rejected", action: "submit", expectedError: 409 },
  { id: "T16", from: "Rejected", action: "approve", expectedError: 409 },
  { id: "T17", from: "Rejected", action: "reject", expectedError: 409 },
  { id: "T18", from: "Rejected", action: "update", expectedError: 409 },
  { id: "T19", from: "Approved", action: terminalActions, expectedError: 409 },
  { id: "T20", from: "Deleted", action: terminalActions, expectedError: 409 },
  { id: "T21", from: "Pending", action: "approve", expectedError: 403, policyAllowed: false },
  { id: "T22", from: "Pending", action: "reject", expectedError: 403, policyAllowed: false },
  { id: "T23", from: "Pending", action: "approve", expectedError: 409, preseedDuplicateActor: true }
];

describe("Request state transition table T01-T23", () => {
  it("creates request with default metadata", () => {
    const request = new Request();

    expect(request.teamId).toBe("team-1");
    expect(request.createdBy).toBe("user-1");
    expect(request.createdAt).toBeInstanceOf(Date);
    expect(request.updatedAt).toBeInstanceOf(Date);
  });

  it("updates updatedAt when state changes", () => {
    const request = new Request({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z")
    });

    request.submit();

    expect(request.updatedAt.getTime()).toBeGreaterThan(request.createdAt.getTime());
  });

  it.each(cases)("$id", (c) => {
    const actorId = "actor-1";
    const policy = createPolicy(c.policyAllowed ?? true);
    const request = createRequestInState(c.from);
    const approvalBefore = request.approvals.length;
    const actions = Array.isArray(c.action) ? c.action : [c.action];

    if (c.preseedDuplicateActor) {
      request.approvals.push(
        new Approval({
          requestId: request.id,
          actedBy: actorId,
          actionType: "Rejected"
        })
      );
    }

    if (c.expectedError) {
      for (const action of actions) {
        expectDomainError(() => performAction(request, action, actorId, policy), c.expectedError);
      }
      return;
    }

    for (const action of actions) {
      performAction(request, action, actorId, policy);
    }

    if (c.expectedStatus) {
      expect(request.status).toBe(c.expectedStatus);
    }
    if (typeof c.expectedApprovalDelta === "number") {
      expect(request.approvals.length - approvalBefore).toBe(c.expectedApprovalDelta);
    }
    if (c.expectedLastActionType) {
      expect(request.approvals.at(-1)?.actionType).toBe(c.expectedLastActionType);
    }
    if (c.id === "T02" || c.id === "T14") {
      expect(request.deletedAt).toBeInstanceOf(Date);
    }
    if (c.id === "T13") {
      expect(request.deletedAt).toBeNull();
    }
  });
});

function createRequestInState(status: Status): Request {
  const policy = createPolicy(true);
  const actorId = "seed-actor";
  const request = new Request({ id: "req-seed", title: "initial", body: "initial" });

  switch (status) {
    case "Draft":
      return request;
    case "Pending":
      request.submit();
      return request;
    case "Approved":
      request.submit();
      request.approve(actorId, policy);
      return request;
    case "Rejected":
      request.submit();
      request.reject(actorId, policy);
      return request;
    case "Deleted":
      request.delete(actorId);
      return request;
  }
}

function performAction(request: Request, action: Action, actorId: string, policy: ApproverPolicy): void {
  switch (action) {
    case "submit":
      request.submit();
      return;
    case "approve":
      request.approve(actorId, policy, "ok");
      return;
    case "reject":
      request.reject(actorId, policy, "ng");
      return;
    case "revise":
      request.revise(actorId);
      return;
    case "delete":
      request.delete(actorId);
      return;
    case "update":
      request.update({ title: "updated", body: "updated body" });
      return;
  }
}

function createPolicy(allowed: boolean): ApproverPolicy {
  return {
    canApprove: () => allowed,
    canReject: () => allowed
  };
}

function expectDomainError(fn: () => void, expectedStatusCode: 403 | 409): void {
  try {
    fn();
    throw new Error("expected DomainError but function succeeded");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).statusCode).toBe(expectedStatusCode);
  }
}
