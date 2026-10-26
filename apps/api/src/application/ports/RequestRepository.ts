import type { Request } from "../../domain/request/Request.js";
import type { Approval } from "../../domain/request/Approval.js";
import type { ListRequestsInput } from "@miniflow/shared";

export type NormalizedListRequestsInput = {
  teamId: string;
  status?: ListRequestsInput["status"];
  includeDeleted: boolean;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

/**
 * The repository hides persistence details from use cases. Add transactional
 * methods here only when a use case actually needs them.
 */
export interface RequestRepository {
  create(request: Request): Promise<Request>;
  /** 取得versionが一致するときだけ保存・incrementする。不一致はStateConflictError。 */
  update(request: Request): Promise<Request>;
  /** 条件付き状態更新と履歴追加を同一transactionで保存する。 */
  approve(request: Request, approval: Approval): Promise<Request>;
  reject(request: Request, approval: Approval): Promise<Request>;
  findById(id: string): Promise<Request | null>;
  list(input: NormalizedListRequestsInput): Promise<{
    items: Request[];
    page: number;
    limit: number;
    total: number;
  }>;
}
