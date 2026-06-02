import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approveRequest } from "../../../../apps/api/src/application/requests/ApproveRequest";
import { submitRequest } from "../../../../apps/api/src/application/requests/SubmitRequest";
import type {
  NormalizedListRequestsInput,
  RequestRepository
} from "../../../../apps/api/src/application/ports/RequestRepository";
import { AuthorizationError } from "../../../../apps/api/src/application/errors/AuthorizationError";
import { Approval } from "../../../../apps/api/src/domain/request/Approval";
import { Request } from "../../../../apps/api/src/domain/request/Request";
import { PrismaRequestRepository } from "../../../../apps/api/src/infrastructure/repositories/PrismaRequestRepository";

const baseTime = new Date("2026-05-17T00:00:00.000Z");

describe("apps/api Request approval consistency", () => {
  it("preserves rejected approval history when revising back to Draft", () => {
    const rejected = createPendingRequest().reject({
      actorId: "approver-1",
      approvalId: "approval-1",
      reason: "needs work",
      now: baseTime
    }).request;

    const revised = rejected.revise({ now: new Date("2026-05-17T01:00:00.000Z") });

    expect(revised.status).toBe("Draft");
    expect(revised.approvals).toHaveLength(1);
    expect(revised.approvals[0]?.actionType).toBe("Rejected");
    expect(revised.approvals[0]?.actedBy).toBe("approver-1");
  });

  it("allows resubmitted Pending requests to keep past Rejected history", () => {
    const request = Request.rehydrate({
      ...baseRequestParams(),
      status: "Pending",
      approvals: [
        new Approval({
          id: "approval-1",
          requestId: "request-1",
          actedBy: "approver-1",
          actionType: "Rejected",
          createdAt: baseTime
        })
      ]
    });

    expect(request.status).toBe("Pending");
    expect(request.approvals).toHaveLength(1);
  });

  it("allows the same approver to decide again after resubmission", () => {
    const request = Request.rehydrate({
      ...baseRequestParams(),
      status: "Pending",
      approvals: [
        new Approval({
          id: "approval-1",
          requestId: "request-1",
          actedBy: "approver-1",
          actionType: "Rejected",
          createdAt: baseTime
        })
      ]
    });

    const result = request.reject({
      actorId: "approver-1",
      approvalId: "approval-2",
      now: new Date("2026-05-17T02:00:00.000Z")
    });

    expect(result.request.status).toBe("Rejected");
    expect(result.request.approvals).toHaveLength(2);
  });

  it("rejects invalid Approved history states", () => {
    expect(() =>
      Request.rehydrate({
        ...baseRequestParams(),
        status: "Approved",
        approvals: []
      })
    ).toThrow("approved status requires exactly one approved record");

    expect(() =>
      Request.rehydrate({
        ...baseRequestParams(),
        status: "Approved",
        approvals: [
          new Approval({
            id: "approval-1",
            requestId: "request-1",
            actedBy: "approver-1",
            actionType: "Approved"
          }),
          new Approval({
            id: "approval-2",
            requestId: "request-1",
            actedBy: "approver-2",
            actionType: "Approved"
          })
        ]
      })
    ).toThrow("approved status requires exactly one approved record");

    expect(() =>
      Request.rehydrate({
        ...baseRequestParams(),
        status: "Pending",
        approvals: [
          new Approval({
            id: "approval-1",
            requestId: "request-1",
            actedBy: "approver-1",
            actionType: "Approved"
          })
        ]
      })
    ).toThrow("non-approved status cannot contain approved records");
  });
});

describe("apps/api approval use cases", () => {
  it("allows the same approver to decide again in a later submission round", async () => {
    const repository = new InMemoryRequestRepository();
    repository.seed(
      Request.rehydrate({
        ...baseRequestParams(),
        status: "Pending",
        approvals: [
          new Approval({
            id: "approval-1",
            requestId: "request-1",
            actedBy: "approver-1",
            actionType: "Rejected",
            createdAt: baseTime
          })
        ]
      })
    );

    const approved = await approveRequest(repository, {
      id: "request-1",
      actorId: "approver-1",
      actorRole: "Approver"
    });

    expect(approved?.status).toBe("Approved");
    expect(approved?.approvals).toHaveLength(2);
    expect(repository.approveCalled).toBe(1);
  });

  it("rejects self approval even when actor has approver role", async () => {
    const repository = new InMemoryRequestRepository();
    repository.seed(
      Request.rehydrate({
        ...baseRequestParams(),
        createdBy: "approver-1",
        status: "Pending"
      })
    );

    await expect(
      approveRequest(repository, { id: "request-1", actorId: "approver-1", actorRole: "Approver" })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.approveCalled).toBe(0);
  });

  it("rejects approval by applicant role", async () => {
    const repository = new InMemoryRequestRepository();
    repository.seed(
      Request.rehydrate({
        ...baseRequestParams(),
        status: "Pending"
      })
    );

    await expect(
      approveRequest(repository, { id: "request-1", actorId: "approver-1", actorRole: "Applicant" })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.approveCalled).toBe(0);
  });

  it("allows requester to submit draft to pending", async () => {
    const repository = new InMemoryRequestRepository();
    repository.seed(Request.rehydrate({ ...baseRequestParams(), status: "Draft" }));

    const submitted = await submitRequest(repository, {
      id: "request-1",
      actorId: "11111111-1111-1111-1111-111111111111",
      actorRole: "Applicant"
    });

    expect(submitted?.status).toBe("Pending");
    expect(repository.updateCalled).toBe(1);
  });

  it("rejects draft submission by another applicant", async () => {
    const repository = new InMemoryRequestRepository();
    repository.seed(Request.rehydrate({ ...baseRequestParams(), status: "Draft" }));

    await expect(
      submitRequest(repository, {
        id: "request-1",
        actorId: "other-user",
        actorRole: "Applicant"
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.updateCalled).toBe(0);
  });
});

describe("apps/api Prisma approval persistence contract", () => {
  it("does not enforce one approval decision per actor across resubmission rounds", () => {
    const schema = readFileSync("apps/api/prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "apps/api/prisma/migrations/20260530000000_allow_approval_actor_redecisions/migration.sql",
      "utf8"
    );

    expect(schema).not.toContain("@@unique([requestId, actedBy])");
    expect(migration).toContain('DROP INDEX IF EXISTS "approvals_requestId_actedBy_key"');
  });

  it("persists request status update and approval insert in one transaction", async () => {
    const request = createPendingRequest().approve({
      actorId: "approver-1",
      approvalId: "approval-1",
      now: baseTime
    });
    const transactionCalls: unknown[][] = [];
    const prisma = {
      requestRecord: {
        update: (args: unknown) => ({ kind: "request.update", args })
      },
      approvalRecord: {
        create: (args: unknown) => ({ kind: "approval.create", args })
      },
      $transaction: async (calls: unknown[]) => {
        transactionCalls.push(calls);
        return [
          {
            id: request.request.id,
            teamId: request.request.teamId,
            createdBy: request.request.createdBy,
            title: request.request.title,
            body: request.request.body,
            status: request.request.status,
            createdAt: request.request.createdAt,
            updatedAt: request.request.updatedAt,
            deletedAt: request.request.deletedAt
          }
        ];
      }
    };

    const repository = new PrismaRequestRepository(prisma as never);
    await repository.approve(request.request, request.approval);

    expect(transactionCalls).toHaveLength(1);
    expect(transactionCalls[0]).toHaveLength(2);
    expect(transactionCalls[0]).toEqual([
      expect.objectContaining({ kind: "request.update" }),
      expect.objectContaining({ kind: "approval.create" })
    ]);
  });
});

class InMemoryRequestRepository implements RequestRepository {
  approveCalled = 0;
  updateCalled = 0;
  private readonly store = new Map<string, Request>();

  seed(request: Request): void {
    this.store.set(request.id, request);
  }

  async create(request: Request): Promise<Request> {
    this.store.set(request.id, request);
    return request;
  }

  async update(request: Request): Promise<Request> {
    this.updateCalled += 1;
    this.store.set(request.id, request);
    return request;
  }

  async approve(request: Request): Promise<Request> {
    this.approveCalled += 1;
    this.store.set(request.id, request);
    return request;
  }

  async reject(request: Request): Promise<Request> {
    this.store.set(request.id, request);
    return request;
  }

  async findById(id: string): Promise<Request | null> {
    return this.store.get(id) ?? null;
  }

  async list(input: NormalizedListRequestsInput): Promise<{
    items: Request[];
    page: number;
    limit: number;
    total: number;
  }> {
    return {
      items: Array.from(this.store.values()),
      page: input.page,
      limit: input.limit,
      total: this.store.size
    };
  }
}

function createPendingRequest(): Request {
  return Request.createDraft({
    id: "request-1",
    teamId: "team-1",
    createdBy: "11111111-1111-1111-1111-111111111111",
    title: "title",
    body: "body",
    now: baseTime
  }).submit(baseTime);
}

function baseRequestParams(): {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
} {
  return {
    id: "request-1",
    teamId: "team-1",
    createdBy: "11111111-1111-1111-1111-111111111111",
    title: "title",
    body: "body",
    createdAt: baseTime,
    updatedAt: baseTime,
    deletedAt: null
  };
}
