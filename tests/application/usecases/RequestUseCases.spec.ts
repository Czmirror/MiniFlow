import { describe, expect, it } from "vitest";
import { ApplicationError } from "../../../src/application/errors/ApplicationError";
import { ApproveRequest } from "../../../src/application/usecases/ApproveRequest";
import { CreateDraft } from "../../../src/application/usecases/CreateDraft";
import { DeleteRequest } from "../../../src/application/usecases/DeleteRequest";
import { RejectRequest } from "../../../src/application/usecases/RejectRequest";
import { ReviseRequest } from "../../../src/application/usecases/ReviseRequest";
import { SubmitRequest } from "../../../src/application/usecases/SubmitRequest";
import { UpdateRequest } from "../../../src/application/usecases/UpdateRequest";
import type { RequestRepository } from "../../../src/application/ports/RequestRepository";
import type { ApproverPolicy } from "../../../src/domain/policies/ApproverPolicy";
import { DomainError } from "../../../src/domain/errors/DomainError";
import { Request } from "../../../src/domain/request/Request";

class InMemoryRequestRepository implements RequestRepository {
  private readonly store = new Map<string, Request>();
  saveCalled = 0;

  seed(request: Request): void {
    this.store.set(request.id, request);
  }

  async findById(id: string): Promise<Request | null> {
    return this.store.get(id) ?? null;
  }

  async save(request: Request): Promise<void> {
    this.saveCalled += 1;
    this.store.set(request.id, request);
  }
}

function createPolicy(allowed: boolean): ApproverPolicy {
  return {
    canApprove: () => allowed,
    canReject: () => allowed
  };
}

describe("CreateDraft", () => {
  it("success: Draftを作成して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new CreateDraft(repo);

    const request = await useCase.execute({
      requestId: "req-create",
      title: "new title",
      body: "new body"
    });

    expect(request.id).toBe("req-create");
    expect(request.status).toBe("Draft");
    expect(request.title).toBe("new title");
    expect(request.body).toBe("new body");
    expect(repo.saveCalled).toBe(1);
  });
});

describe("SubmitRequest", () => {
  it("success: DraftをPendingへ遷移して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-1" });
    repo.seed(request);

    const useCase = new SubmitRequest(repo);
    await useCase.execute({ requestId: "req-1" });

    expect(request.status).toBe("Pending");
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new SubmitRequest(repo);

    await expect(useCase.execute({ requestId: "missing" })).rejects.toBeInstanceOf(ApplicationError);
    await expect(useCase.execute({ requestId: "missing" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("failure: status不正なら409", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-1" });
    request.submit();
    repo.seed(request);

    const useCase = new SubmitRequest(repo);
    await expect(useCase.execute({ requestId: "req-1" })).rejects.toBeInstanceOf(DomainError);
    await expect(useCase.execute({ requestId: "req-1" })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("UpdateRequest", () => {
  it("success: Draftの内容を更新して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-update", title: "before", body: "before" });
    repo.seed(request);

    const useCase = new UpdateRequest(repo);
    await useCase.execute({ requestId: "req-update", title: "after", body: "after" });

    expect(request.title).toBe("after");
    expect(request.body).toBe("after");
    expect(request.status).toBe("Draft");
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new UpdateRequest(repo);

    await expect(useCase.execute({ requestId: "missing", title: "x" })).rejects.toBeInstanceOf(
      ApplicationError
    );
    await expect(useCase.execute({ requestId: "missing", title: "x" })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("failure: Draft以外は409", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-update" });
    request.submit();
    repo.seed(request);

    const useCase = new UpdateRequest(repo);
    await expect(useCase.execute({ requestId: "req-update", title: "x" })).rejects.toBeInstanceOf(
      DomainError
    );
    await expect(useCase.execute({ requestId: "req-update", title: "x" })).rejects.toMatchObject({
      statusCode: 409
    });
  });
});

describe("ApproveRequest", () => {
  it("success: PendingをApprovedへ遷移しApprovalを追加して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-2" });
    request.submit();
    repo.seed(request);

    const useCase = new ApproveRequest(repo, createPolicy(true));
    await useCase.execute({ requestId: "req-2", actorId: "actor-1", reason: "ok" });

    expect(request.status).toBe("Approved");
    expect(request.approvals.length).toBe(1);
    expect(request.approvals[0]?.actionType).toBe("Approved");
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new ApproveRequest(repo, createPolicy(true));

    await expect(
      useCase.execute({ requestId: "missing", actorId: "actor-1" })
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      useCase.execute({ requestId: "missing", actorId: "actor-1" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("failure: policyで拒否されたら403", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-2" });
    request.submit();
    repo.seed(request);

    const useCase = new ApproveRequest(repo, createPolicy(false));
    await expect(useCase.execute({ requestId: "req-2", actorId: "actor-1" })).rejects.toBeInstanceOf(
      DomainError
    );
    await expect(useCase.execute({ requestId: "req-2", actorId: "actor-1" })).rejects.toMatchObject({
      statusCode: 403
    });
  });
});

describe("RejectRequest", () => {
  it("success: PendingをRejectedへ遷移しApprovalを追加して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-3" });
    request.submit();
    repo.seed(request);

    const useCase = new RejectRequest(repo, createPolicy(true));
    await useCase.execute({ requestId: "req-3", actorId: "actor-1", reason: "ng" });

    expect(request.status).toBe("Rejected");
    expect(request.approvals.length).toBe(1);
    expect(request.approvals[0]?.actionType).toBe("Rejected");
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new RejectRequest(repo, createPolicy(true));

    await expect(useCase.execute({ requestId: "missing", actorId: "actor-1" })).rejects.toBeInstanceOf(
      ApplicationError
    );
    await expect(useCase.execute({ requestId: "missing", actorId: "actor-1" })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("failure: policyで拒否されたら403", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-3" });
    request.submit();
    repo.seed(request);

    const useCase = new RejectRequest(repo, createPolicy(false));
    await expect(useCase.execute({ requestId: "req-3", actorId: "actor-1" })).rejects.toBeInstanceOf(
      DomainError
    );
    await expect(useCase.execute({ requestId: "req-3", actorId: "actor-1" })).rejects.toMatchObject({
      statusCode: 403
    });
  });
});

describe("ReviseRequest", () => {
  it("success: RejectedをDraftへ戻して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-revise" });
    request.submit();
    request.reject("approver-1", createPolicy(true), "ng");
    repo.seed(request);

    const approvalCountBefore = request.approvals.length;
    const useCase = new ReviseRequest(repo);
    await useCase.execute({ requestId: "req-revise", actorId: "requester-1" });

    expect(request.status).toBe("Draft");
    expect(request.approvals.length).toBe(approvalCountBefore);
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new ReviseRequest(repo);

    await expect(useCase.execute({ requestId: "missing", actorId: "user-1" })).rejects.toBeInstanceOf(
      ApplicationError
    );
    await expect(useCase.execute({ requestId: "missing", actorId: "user-1" })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("failure: Rejected以外は409", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-revise" });
    repo.seed(request);

    const useCase = new ReviseRequest(repo);
    await expect(useCase.execute({ requestId: "req-revise", actorId: "user-1" })).rejects.toBeInstanceOf(
      DomainError
    );
    await expect(useCase.execute({ requestId: "req-revise", actorId: "user-1" })).rejects.toMatchObject({
      statusCode: 409
    });
  });
});

describe("DeleteRequest", () => {
  it("success: DraftをDeletedへ遷移して保存する", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-delete" });
    repo.seed(request);

    const useCase = new DeleteRequest(repo);
    await useCase.execute({ requestId: "req-delete", actorId: "user-1" });

    expect(request.status).toBe("Deleted");
    expect(request.deletedAt).toBeInstanceOf(Date);
    expect(repo.saveCalled).toBe(1);
  });

  it("failure: requestが無ければ404", async () => {
    const repo = new InMemoryRequestRepository();
    const useCase = new DeleteRequest(repo);

    await expect(useCase.execute({ requestId: "missing", actorId: "user-1" })).rejects.toBeInstanceOf(
      ApplicationError
    );
    await expect(useCase.execute({ requestId: "missing", actorId: "user-1" })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("failure: Pendingは409", async () => {
    const repo = new InMemoryRequestRepository();
    const request = new Request({ id: "req-delete" });
    request.submit();
    repo.seed(request);

    const useCase = new DeleteRequest(repo);
    await expect(useCase.execute({ requestId: "req-delete", actorId: "user-1" })).rejects.toBeInstanceOf(
      DomainError
    );
    await expect(useCase.execute({ requestId: "req-delete", actorId: "user-1" })).rejects.toMatchObject({
      statusCode: 409
    });
  });
});
