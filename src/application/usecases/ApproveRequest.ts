import type { ApproverPolicy } from "../../domain/policies/ApproverPolicy";
import { ApplicationError } from "../errors/ApplicationError";
import type { RequestRepository } from "../ports/RequestRepository";

export class ApproveRequest {
  constructor(
    private readonly requestRepository: RequestRepository,
    private readonly approverPolicy: ApproverPolicy
  ) {}

  async execute(input: { requestId: string; actorId: string; reason?: string }): Promise<void> {
    const request = await this.requestRepository.findById(input.requestId);
    if (!request) {
      throw new ApplicationError("request not found", 404, "NOT_FOUND");
    }

    request.approve(input.actorId, this.approverPolicy, input.reason);
    await this.requestRepository.save(request);
  }
}
