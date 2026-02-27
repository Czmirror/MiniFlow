/**
 * T01-T23 state transition test template for Request aggregate.
 * Replace TODOs with your actual domain imports and factory helpers.
 */

import { Request } from "@/domain/request/Request";
import { DomainError } from "@/domain/errors/DomainError";
import type { ApproverPolicy } from "@/domain/policies/ApproverPolicy";

type Status = "Draft" | "Pending" | "Approved" | "Rejected" | "Deleted";
type Action = "submit" | "approve" | "reject" | "revise" | "delete" | "update";
type ExpectedErrorCode = 403 | 409;

type TestCase = {
  id: string;
  from: Status;
  action: Action | Action[];
  expectedStatus?: Status;
  expectedErrorCode?: ExpectedErrorCode;
  note: string;
  policyAllowed?: boolean;
  duplicateApprove?: boolean;
  expectApprovalDelta?: number;
};

const TERMINAL_ACTIONS: Action[] = [
  "submit",
  "approve",
  "reject",
  "revise",
  "delete",
  "update",
];

const cases: TestCase[] = [
  { id: "T01", from: "Draft", action: "submit", expectedStatus: "Pending", note: "submit success" },
  { id: "T02", from: "Draft", action: "delete", expectedStatus: "Deleted", note: "delete success" },
  { id: "T03", from: "Draft", action: "approve", expectedErrorCode: 409, note: "approve only Pending" },
  { id: "T04", from: "Draft", action: "reject", expectedErrorCode: 409, note: "reject only Pending" },
  { id: "T05", from: "Draft", action: "revise", expectedErrorCode: 409, note: "revise only Rejected" },
  { id: "T06", from: "Draft", action: "update", expectedStatus: "Draft", note: "update Draft" },
  {
    id: "T07",
    from: "Pending",
    action: "approve",
    expectedStatus: "Approved",
    note: "approve success + approval added",
    expectApprovalDelta: 1,
  },
  {
    id: "T08",
    from: "Pending",
    action: "reject",
    expectedStatus: "Rejected",
    note: "reject success + approval added",
    expectApprovalDelta: 1,
  },
  { id: "T09", from: "Pending", action: "submit", expectedErrorCode: 409, note: "submit only Draft" },
  { id: "T10", from: "Pending", action: "revise", expectedErrorCode: 409, note: "revise only Rejected" },
  { id: "T11", from: "Pending", action: "delete", expectedErrorCode: 409, note: "delete only Draft/Rejected" },
  { id: "T12", from: "Pending", action: "update", expectedErrorCode: 409, note: "update only Draft" },
  {
    id: "T13",
    from: "Rejected",
    action: "revise",
    expectedStatus: "Draft",
    note: "revise success, no approval added",
    expectApprovalDelta: 0,
  },
  {
    id: "T14",
    from: "Rejected",
    action: "delete",
    expectedStatus: "Deleted",
    note: "delete success",
  },
  { id: "T15", from: "Rejected", action: "submit", expectedErrorCode: 409, note: "submit only Draft" },
  { id: "T16", from: "Rejected", action: "approve", expectedErrorCode: 409, note: "approve only Pending" },
  { id: "T17", from: "Rejected", action: "reject", expectedErrorCode: 409, note: "reject only Pending" },
  { id: "T18", from: "Rejected", action: "update", expectedErrorCode: 409, note: "update only Draft" },
  {
    id: "T19",
    from: "Approved",
    action: TERMINAL_ACTIONS,
    expectedErrorCode: 409,
    note: "terminal status protection",
  },
  {
    id: "T20",
    from: "Deleted",
    action: TERMINAL_ACTIONS,
    expectedErrorCode: 409,
    note: "terminal status protection",
  },
  {
    id: "T21",
    from: "Pending",
    action: "approve",
    expectedErrorCode: 403,
    note: "policy denies approve",
    policyAllowed: false,
  },
  {
    id: "T22",
    from: "Pending",
    action: "reject",
    expectedErrorCode: 403,
    note: "policy denies reject",
    policyAllowed: false,
  },
  {
    id: "T23",
    from: "Pending",
    action: "approve",
    expectedErrorCode: 409,
    note: "duplicate approve rejected",
    duplicateApprove: true,
  },
];

describe("Request state transition table", () => {
  it.each(cases)("$id $from $action -> $expectedStatus/$expectedErrorCode ($note)", (c) => {
    const request = createRequestInState(c.from);
    const policy = createApproverPolicy(c.policyAllowed ?? true);
    const actorId = "actor-1";
    const actions = Array.isArray(c.action) ? c.action : [c.action];
    const beforeApprovals = request.approvals.length;

    if (c.duplicateApprove) {
      performAction(request, "approve", { actorId, policy });
    }

    for (const action of actions) {
      if (c.expectedErrorCode) {
        expect(() => performAction(request, action, { actorId, policy })).toThrowDomainError(
          c.expectedErrorCode,
        );
      } else {
        performAction(request, action, { actorId, policy });
      }
    }

    if (c.expectedStatus) {
      expect(request.status).toBe(c.expectedStatus);
    }

    if (typeof c.expectApprovalDelta === "number") {
      expect(request.approvals.length - beforeApprovals).toBe(c.expectApprovalDelta);
    }
  });
});

/**
 * TODO: Replace below helpers with your production code adapters.
 */
function createRequestInState(status: Status): {
  status: Status;
  approvals: Array<{ actionType: "Approved" | "Rejected"; actedBy: string }>;
} {
  // TODO: use Request factory/fixture from domain layer
  return { status, approvals: [] };
}

function createApproverPolicy(allowed: boolean): { canApprove: () => boolean; canReject: () => boolean } {
  return {
    canApprove: () => allowed,
    canReject: () => allowed,
  };
}

function performAction(
  _request: { status: Status; approvals: Array<{ actionType: "Approved" | "Rejected"; actedBy: string }> },
  _action: Action,
  _ctx: { actorId: string; policy: { canApprove: () => boolean; canReject: () => boolean } },
): void {
  // TODO: call real aggregate methods:
  // - submit()
  // - approve(actorId, policy)
  // - reject(actorId, policy)
  // - revise(actorId)
  // - delete(actorId)
  // - update(...)
  throw new Error("TODO: wire to real Request aggregate");
}

expect.extend({
    toThrowDomainError(received: () => void, expectedCode: number) {
        try {
            received();
            return { pass: false, message: () => "DomainErrorが投げられていません" };
        } catch (e) {
            const pass =
                e instanceof DomainError &&
                (e.httpStatus === expectedCode || e.statusCode === expectedCode);
            return {
                pass,
                message: () => `expected=${expectedCode}, actual=${JSON.stringify(e)}`,
            };
        }
    },
});


function createRequestInState(status: Status): Request {
    const r = Request.createDraft({
        id: "req-1",
        teamId: "team-1",
        title: "t",
        body: "b",
        createdBy: "user-1",
    });

    // 直接statusを書き換えず、遷移で作るのが安全
    if (status === "Pending") r.submit();
    if (status === "Rejected") {
        r.submit();
        r.reject("approver-1", createApproverPolicy(true));
    }
    if (status === "Approved") {
        r.submit();
        r.approve("approver-1", createApproverPolicy(true));
    }
    if (status === "Deleted") {
        if (r.status === "Draft") r.delete("user-1");
    }

    return r;
}

function performAction(
    request: Request,
    action: Action,
    ctx: { actorId: string; policy: ApproverPolicy },
): void {
    switch (action) {
        case "submit":
            request.submit();
            return;
        case "approve":
            request.approve(ctx.actorId, ctx.policy);
            return;
        case "reject":
            request.reject(ctx.actorId, ctx.policy, "reason");
            return;
        case "revise":
            request.revise(ctx.actorId);
            return;
        case "delete":
            request.delete(ctx.actorId);
            return;
        case "update":
            request.update({ title: "updated", body: "updated" });
            return;
    }
}
