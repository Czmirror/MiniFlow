import type { Request } from "../../domain/request/Request.js";

export interface RequestRepository {
  create(request: Request): Promise<Request>;
}
