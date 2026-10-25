/**
 * 現行APIの申請テストに、固定時刻の実ドメインと置換可能な保存先を提供する。
 * I/Oだけをメモリに置き換え、状態遷移・認可は本番実装を呼び出す。
 */
import type { NormalizedListRequestsInput, RequestRepository } from "../../apps/api/src/application/ports/RequestRepository";
import { Request } from "../../apps/api/src/domain/request/Request";
import type { Status } from "../../apps/api/src/domain/request/Status";

export const baseTime = new Date("2026-01-01T00:00:00.000Z");
export const requesterId = "requester-1";
export const approverId = "approver-1";

/** 指定状態まで本番の遷移を実行した申請を返す。外部I/Oは行わない。 */
export function requestInState(status: Status = "Draft"): Request {
  const draft = Request.createDraft({
    id: "request-1", teamId: "team-1", createdBy: requesterId,
    title: "initial title", body: "initial body", now: baseTime
  });
  switch (status) {
    case "Draft": return draft;
    case "Pending": return draft.submit(baseTime);
    case "Approved": return draft.submit(baseTime).approve({ actorId: approverId, approvalId: "seed-approval", now: baseTime }).request;
    case "Rejected": return draft.submit(baseTime).reject({ actorId: approverId, approvalId: "seed-rejection", reason: "needs work", now: baseTime }).request;
    case "Deleted": return draft.delete({ now: baseTime });
  }
}

/** 保存結果と回数を観測するfake。DBの制約・競合・検索条件は保証しない。 */
export class InMemoryRequestRepository implements RequestRepository {
  readonly records = new Map<string, Request>();
  readonly writes: Request[] = [];

  constructor(request?: Request) {
    if (request) this.records.set(request.id, request);
  }

  async findById(id: string): Promise<Request | null> {
    return this.records.get(id) ?? null;
  }

  async create(request: Request): Promise<Request> { return this.persist(request); }
  async update(request: Request): Promise<Request> { return this.persist(request); }
  async approve(request: Request): Promise<Request> { return this.persist(request); }
  async reject(request: Request): Promise<Request> { return this.persist(request); }

  async list(input: NormalizedListRequestsInput) {
    return { items: [...this.records.values()], page: input.page, limit: input.limit, total: this.records.size };
  }

  private persist(request: Request): Request {
    this.writes.push(request);
    this.records.set(request.id, request);
    return request;
  }
}
