import type { Request } from "../../domain/request/Request";

export interface RequestRepository {
  findById(id: string): Promise<Request | null>;
  save(request: Request): Promise<void>;
}
