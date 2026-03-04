import type { Request } from "../request/Request";

export interface ApproverPolicy {
  canApprove(request: Request, actorId: string): boolean;
  canReject(request: Request, actorId: string): boolean;
}
