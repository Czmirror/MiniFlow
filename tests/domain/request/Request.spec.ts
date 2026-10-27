/**
 * 現行APIの不変なRequestを対象に、許可・禁止遷移と履歴保持を検証する。
 * 認可はapplicationテストで確認し、ここでは時計を固定してDBなしで実行する。
 */
import { describe, expect, it } from "vitest";
import { StateConflictError } from "../../../apps/api/src/domain/errors/StateConflictError";
import { Request } from "../../../apps/api/src/domain/request/Request";
import type { Status } from "../../../apps/api/src/domain/request/Status";
import { approverId, baseTime, requestInState } from "../../support/requests";

type Action = "submit" | "approve" | "reject" | "revise" | "delete" | "update";
// HTTP statusはHTTP試験で確認し、ここでは業務例外と理由を確認する。
const forbiddenMessages: Record<Action, string> = { submit: "submit is only allowed in Draft", approve: "approve is only allowed in Pending", reject: "reject is only allowed in Pending", revise: "revise is only allowed in Rejected", delete: "delete is only allowed in Draft/Rejected", update: "update is only allowed in Draft" };
const actions: Action[] = ["submit", "approve", "reject", "revise", "delete", "update"];
const transitions: Array<{ id: string; from: Status; action: Action; to: Status; approvalDelta: number }> = [
  { id: "T01", from: "Draft", action: "submit", to: "Pending", approvalDelta: 0 },
  { id: "T02", from: "Draft", action: "delete", to: "Deleted", approvalDelta: 0 },
  { id: "T06", from: "Draft", action: "update", to: "Draft", approvalDelta: 0 },
  { id: "T07", from: "Pending", action: "approve", to: "Approved", approvalDelta: 1 },
  { id: "T08", from: "Pending", action: "reject", to: "Rejected", approvalDelta: 1 },
  { id: "T13", from: "Rejected", action: "revise", to: "Draft", approvalDelta: 0 },
  { id: "T14", from: "Rejected", action: "delete", to: "Deleted", approvalDelta: 0 }
];
const forbidden: Array<{ id: string; from: Status; actions: Action[] }> = [
  { id: "T03-T05", from: "Draft", actions: ["approve", "reject", "revise"] },
  { id: "T09-T12", from: "Pending", actions: ["submit", "revise", "delete", "update"] },
  { id: "T15-T18", from: "Rejected", actions: ["submit", "approve", "reject", "update"] },
  { id: "T19", from: "Approved", actions },
  { id: "T20", from: "Deleted", actions }
];

describe("現行API Requestの状態遷移", () => {
  it.each(transitions)("$id $from → $to ($action)", ({ from, action, to, approvalDelta }) => {
    const before = requestInState(from);
    const result = perform(before, action);
    expect(result.status).toBe(to);
    expect(result.approvals.length - before.approvals.length).toBe(approvalDelta);
    expect(result.updatedAt).toEqual(baseTime);
    expect(result.deletedAt).toEqual(to === "Deleted" ? baseTime : null);
    if (action === "approve" || action === "reject") {
      expect(result.approvals.at(-1)).toMatchObject({
        requestId: before.id, actedBy: approverId,
        actionType: action === "approve" ? "Approved" : "Rejected", reason: "decision", createdAt: baseTime
      });
    }
    if (action === "update") {
      expect(result.title).toBe("updated title");
      expect(result.body).toBe("updated body");
    }
    expect(before.status).toBe(from);
    expect(before.title).toBe("initial title");
    expect(before.body).toBe("initial body");
  });

  for (const row of forbidden) {
    it.each(row.actions)(`${row.id} ${row.from}の%sを競合例外で拒否し元の状態を保つ`, (action) => {
      const before = requestInState(row.from);
      const snapshot = { ...before, approvals: [...before.approvals] };
      expect(() => perform(before, action)).toThrow(StateConflictError);
      expect(() => perform(before, action)).toThrow(expect.objectContaining({ message: forbiddenMessages[action] }));
      expect({ ...before }).toEqual(snapshot);
    });
  }

  it("明示したメタデータを保持しDraftを作る", () => {
    const request = requestInState();
    expect(request).toMatchObject({ id: "request-1", teamId: "team-1", createdBy: "requester-1", status: "Draft", createdAt: baseTime, updatedAt: baseTime, deletedAt: null, approvals: [] });
  });

  it("元の時刻を変えず遷移時刻を記録する", () => {
    const draft = requestInState();
    const later = new Date("2026-01-02T00:00:00.000Z");
    const pending = draft.submit(later);
    expect(pending.createdAt).toEqual(baseTime);
    expect(pending.updatedAt).toEqual(later);
    expect(draft.updatedAt).toEqual(baseTime);
  });

  it("差し戻し履歴を保持して再提出し、同じ承認者が再決定できる（旧T23を置換）", () => {
    const rejected = requestInState("Rejected");
    const draft = rejected.revise({ now: baseTime });
    const pending = draft.submit(baseTime);
    const result = pending.approve({ actorId: approverId, approvalId: "second-decision", now: baseTime });
    expect(draft.approvals).toEqual(rejected.approvals);
    expect(pending.approvals).toEqual(rejected.approvals);
    expect(result.request.status).toBe("Approved");
    expect(result.request.approvals.map(a => a.actionType)).toEqual(["Rejected", "Approved"]);
    expect(result.approval.id).toBe("second-decision");
  });

  it.each(["", "   "])("空の件名・本文を再構築時に拒否する: %j", value => {
    const params = { ...requestInState() };
    expect(() => Request.rehydrate({ ...params, title: value })).toThrow("title must not be empty");
    expect(() => Request.rehydrate({ ...params, body: value })).toThrow("body must not be empty");
  });

  it.each([
    { status: "Deleted" as const, deletedAt: null },
    { status: "Draft" as const, deletedAt: baseTime }
  ])("status/deletedAtの不一致を拒否する: $status", params => {
    expect(() => Request.rehydrate({ ...requestInState(), ...params })).toThrow("deleted status and deletedAt must stay in sync");
  });

  it("Approved履歴があるPendingと、承認履歴のないApprovedを拒否する", () => {
    expect(() => Request.rehydrate({ ...requestInState("Approved"), status: "Pending" })).toThrow("non-approved status cannot contain approved records");
    expect(() => Request.rehydrate({ ...requestInState("Pending"), status: "Approved" })).toThrow("approved status requires exactly one approved record");
  });

  it("複数のApproved履歴を拒否する", () => {
    const approved = requestInState("Approved");
    expect(() => Request.rehydrate({ ...approved, approvals: [...approved.approvals, ...approved.approvals] })).toThrow("approved status requires exactly one approved record");
  });
});

function perform(request: Request, action: Action): Request {
  switch (action) {
    case "submit": return request.submit(baseTime);
    case "approve": return request.approve({ actorId: approverId, approvalId: "approval-1", reason: "decision", now: baseTime }).request;
    case "reject": return request.reject({ actorId: approverId, approvalId: "approval-1", reason: "decision", now: baseTime }).request;
    case "revise": return request.revise({ now: baseTime });
    case "delete": return request.delete({ now: baseTime });
    case "update": return request.update({ title: " updated title ", body: " updated body ", now: baseTime });
  }
}
