/**
 * HTTPから呼ばれる現行申請usecaseの成功・不在・状態違反・認可拒否を検証する。
 * 保存先だけをfakeに置換し、拒否時には書き込みと元状態の変更がないことを確認する。
 */
import { describe, expect, it, vi } from "vitest";
import { approveRequest } from "../../../apps/api/src/application/requests/ApproveRequest";
import { createRequest } from "../../../apps/api/src/application/requests/CreateRequest";
import { deleteRequest } from "../../../apps/api/src/application/requests/DeleteRequest";
import { getRequestById } from "../../../apps/api/src/application/requests/GetRequestById";
import { listRequests } from "../../../apps/api/src/application/requests/ListRequests";
import { rejectRequest } from "../../../apps/api/src/application/requests/RejectRequest";
import { reviseRequest } from "../../../apps/api/src/application/requests/ReviseRequest";
import { submitRequest } from "../../../apps/api/src/application/requests/SubmitRequest";
import { updateRequest } from "../../../apps/api/src/application/requests/UpdateRequest";
import { AuthorizationError } from "../../../apps/api/src/application/errors/AuthorizationError";
import { InputValidationError } from "../../../apps/api/src/application/errors/InputValidationError";
import { StateConflictError } from "../../../apps/api/src/application/errors/StateConflictError";
import type { RequestRepository } from "../../../apps/api/src/application/ports/RequestRepository";
import type { Status } from "../../../apps/api/src/domain/request/Status";
import type { UserRole } from "../../../apps/api/src/domain/user/User";
import { approverId, InMemoryRequestRepository, requesterId, requestInState } from "../../support/requests";

const workflows: Array<{
  name: string; from: Status; to: Status; invalidFrom: Status;
  run: (repo: RequestRepository, id: string) => ReturnType<typeof submitRequest>;
}> = [
  { name: "submit", from: "Draft", to: "Pending", invalidFrom: "Pending", run: (repo, id) => submitRequest(repo, { id, actorId: requesterId, actorRole: "Applicant" }) },
  { name: "update", from: "Draft", to: "Draft", invalidFrom: "Pending", run: (repo, id) => updateRequest(repo, { id, title: " after ", body: " after body " }) },
  { name: "approve", from: "Pending", to: "Approved", invalidFrom: "Draft", run: (repo, id) => approveRequest(repo, { id, actorId: approverId, actorRole: "Approver", reason: "approved reason" }) },
  { name: "reject", from: "Pending", to: "Rejected", invalidFrom: "Draft", run: (repo, id) => rejectRequest(repo, { id, actorId: approverId, actorRole: "Approver", reason: "rejected reason" }) },
  { name: "revise", from: "Rejected", to: "Draft", invalidFrom: "Draft", run: (repo, id) => reviseRequest(repo, id) },
  { name: "delete", from: "Draft", to: "Deleted", invalidFrom: "Pending", run: (repo, id) => deleteRequest(repo, id) }
];

describe("現行API申請usecase", () => {
  it("Draftを作成し認証から渡されたactor/teamと正規化した内容を保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const result = await createRequest(repo, { actorId: " requester-1 ", teamId: " team-9 ", title: " title ", body: " body " });
    expect(result).toMatchObject({ teamId: "team-9", createdBy: requesterId, status: "Draft", title: "title", body: "body", deletedAt: null });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(repo.writes).toEqual([result]);
    expect(await repo.findById(result.id)).toBe(result);
  });

  it.each(["actorId", "teamId", "title", "body"] as const)("createの%sが空なら400、未保存", async field => {
    const repo = new InMemoryRequestRepository();
    await expect(createRequest(repo, { actorId: requesterId, teamId: "team-1", title: "title", body: "body", [field]: " " })).rejects.toBeInstanceOf(InputValidationError);
    expect(repo.writes).toHaveLength(0);
  });

  for (const workflow of workflows) {
    describe(workflow.name, () => {
      it("成功時だけ変更結果を保存し、元のaggregateは変更しない", async () => {
        const before = requestInState(workflow.from);
        const repo = new InMemoryRequestRepository(before);
        const result = await workflow.run(repo, before.id);
        expect(result?.status).toBe(workflow.to);
        expect(repo.writes).toEqual([result]);
        expect(await repo.findById(before.id)).toBe(result);
        expect(before.status).toBe(workflow.from);
        if (workflow.name === "update") {
          expect(result).toMatchObject({ title: "after", body: "after body" });
          expect(before.title).toBe("initial title");
        }
        if (workflow.name === "approve" || workflow.name === "reject") {
          expect(result?.approvals).toHaveLength(1);
          expect(result?.approvals[0]).toMatchObject({ actedBy: approverId, reason: `${workflow.name === "approve" ? "approved" : "rejected"} reason` });
        }
        if (workflow.name === "revise") expect(result?.approvals).toEqual(before.approvals);
        if (workflow.name === "delete") expect(result?.deletedAt).toBeInstanceOf(Date);
      });

      it("不在ならnullを返し、HTTP層の404判断に委ねる", async () => {
        const repo = new InMemoryRequestRepository();
        expect(await workflow.run(repo, "missing")).toBeNull();
        expect(repo.writes).toHaveLength(0);
      });

      it("不正な状態を409で拒否して保存しない", async () => {
        const before = requestInState(workflow.invalidFrom);
        const repo = new InMemoryRequestRepository(before);
        await expect(workflow.run(repo, before.id)).rejects.toBeInstanceOf(StateConflictError);
        expect(repo.writes).toHaveLength(0);
        expect(await repo.findById(before.id)).toBe(before);
      });

      it("空IDを拒否して保存しない", async () => {
        const repo = new InMemoryRequestRepository();
        await expect(workflow.run(repo, " ")).rejects.toBeInstanceOf(InputValidationError);
        expect(repo.writes).toHaveLength(0);
      });
    });
  }

  it("差し戻しから修正・再提出し、同じ承認者が再決定できる", async () => {
    const rejected = requestInState("Rejected");
    const repo = new InMemoryRequestRepository(rejected);
    await reviseRequest(repo, rejected.id);
    await updateRequest(repo, { id: rejected.id, title: "corrected" });
    await submitRequest(repo, { id: rejected.id, actorId: requesterId, actorRole: "Applicant" });
    const result = await approveRequest(repo, { id: rejected.id, actorId: approverId, actorRole: "Approver" });
    expect(result?.status).toBe("Approved");
    expect(result?.title).toBe("corrected");
    expect(result?.approvals.map(a => a.actionType)).toEqual(["Rejected", "Approved"]);
    expect(repo.writes).toHaveLength(4);
  });

  it("Rejectedも履歴を維持して論理削除する", async () => {
    const rejected = requestInState("Rejected");
    const repo = new InMemoryRequestRepository(rejected);
    const result = await deleteRequest(repo, rejected.id);
    expect(result?.status).toBe("Deleted");
    expect(result?.approvals).toEqual(rejected.approvals);
    expect(result?.deletedAt).toBeInstanceOf(Date);
  });

  it("部分更新で未指定の本文を維持する", async () => {
    const repo = new InMemoryRequestRepository(requestInState());
    const result = await updateRequest(repo, { id: "request-1", title: "new title" });
    expect(result).toMatchObject({ title: "new title", body: "initial body" });
  });

  it("編集項目がなければ400で拒否して保存しない", async () => {
    const repo = new InMemoryRequestRepository(requestInState());
    await expect(updateRequest(repo, { id: "request-1" })).rejects.toBeInstanceOf(InputValidationError);
    expect(repo.writes).toHaveLength(0);
  });
});

describe("現行usecaseの認可（旧T21/T22のPolicyテストを置換）", () => {
  for (const [name, decide] of [["approve", approveRequest], ["reject", rejectRequest]] as const) {
    it.each<UserRole>(["Applicant", "Approver", "Admin"])(`${name}: %sでも自己承認・自己差し戻しを拒否し未保存`, async actorRole => {
      const request = requestInState("Pending");
      const repo = new InMemoryRequestRepository(request);
      await expect(decide(repo, { id: request.id, actorId: requesterId, actorRole })).rejects.toBeInstanceOf(AuthorizationError);
      expect(repo.writes).toHaveLength(0);
      expect(await repo.findById(request.id)).toBe(request);
    });

    it(`${name}: 他人の申請もApplicantは決定できない`, async () => {
      const repo = new InMemoryRequestRepository(requestInState("Pending"));
      await expect(decide(repo, { id: "request-1", actorId: "other-applicant", actorRole: "Applicant" })).rejects.toBeInstanceOf(AuthorizationError);
      expect(repo.writes).toHaveLength(0);
    });

    it.each<UserRole>(["Approver", "Admin"])(`${name}: %sは他人の申請を決定できる`, async actorRole => {
      const repo = new InMemoryRequestRepository(requestInState("Pending"));
      const result = await decide(repo, { id: "request-1", actorId: approverId, actorRole });
      expect(result?.status).toBe(name === "approve" ? "Approved" : "Rejected");
      expect(repo.writes).toHaveLength(1);
    });
  }

  it("他人のDraft提出を拒否し未保存", async () => {
    const repo = new InMemoryRequestRepository(requestInState());
    await expect(submitRequest(repo, { id: "request-1", actorId: "other-applicant", actorRole: "Applicant" })).rejects.toBeInstanceOf(AuthorizationError);
    expect(repo.writes).toHaveLength(0);
  });

  it("Adminは他人のDraftを提出できる", async () => {
    const repo = new InMemoryRequestRepository(requestInState());
    expect((await submitRequest(repo, { id: "request-1", actorId: "admin-1", actorRole: "Admin" }))?.status).toBe("Pending");
    expect(repo.writes).toHaveLength(1);
  });
});

describe("現行usecaseの読み取りと保存失敗", () => {
  it("詳細は保存先の結果と不在を返す", async () => {
    const request = requestInState();
    const repo = new InMemoryRequestRepository(request);
    expect(await getRequestById(repo, ` ${request.id} `)).toBe(request);
    expect(await getRequestById(repo, "missing")).toBeNull();
    await expect(getRequestById(repo, " ")).rejects.toBeInstanceOf(InputValidationError);
  });

  it("一覧の既定値とteamを正規化して保存先へ渡す", async () => {
    const repo = new InMemoryRequestRepository();
    const list = vi.spyOn(repo, "list");
    expect(await listRequests(repo, { teamId: " team-1 " })).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(list).toHaveBeenCalledWith({ teamId: "team-1", includeDeleted: false, page: 1, limit: 20 });
  });

  it.each([{ page: 0 }, { page: 1.5 }, { limit: 0 }, { limit: 101 }, { from: "invalid" }, { to: "invalid" }])("一覧の既存制約を拒否する: %j", async params => {
    const repo = new InMemoryRequestRepository();
    const list = vi.spyOn(repo, "list");
    await expect(listRequests(repo, { teamId: "team-1", ...params })).rejects.toBeInstanceOf(InputValidationError);
    expect(list).not.toHaveBeenCalled();
  });

  it("保存失敗を成功扱いせず呼び出し元へ伝播する", async () => {
    const request = requestInState();
    const repo = new InMemoryRequestRepository(request);
    const failure = new Error("storage unavailable");
    vi.spyOn(repo, "update").mockRejectedValue(failure);
    await expect(submitRequest(repo, { id: request.id, actorId: requesterId, actorRole: "Applicant" })).rejects.toBe(failure);
    expect(await repo.findById(request.id)).toBe(request);
    expect(request.status).toBe("Draft");
  });
});
