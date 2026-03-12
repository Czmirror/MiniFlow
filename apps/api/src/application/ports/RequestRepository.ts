import type { Request } from "../../domain/request/Request.js";
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
  update(request: Request): Promise<Request>;
  findById(id: string): Promise<Request | null>;
  list(input: NormalizedListRequestsInput): Promise<{
    items: Request[];
    page: number;
    limit: number;
    total: number;
  }>;
}
