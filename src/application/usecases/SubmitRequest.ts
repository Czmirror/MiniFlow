import { ApplicationError } from "../errors/ApplicationError";
import type { RequestRepository } from "../ports/RequestRepository";

export class SubmitRequest {
  constructor(private readonly requestRepository: RequestRepository) {}

  async execute(input: { requestId: string }): Promise<void> {
    const request = await this.requestRepository.findById(input.requestId);
    if (!request) {
      throw new ApplicationError("request not found", 404, "NOT_FOUND");
    }

    request.submit();
    await this.requestRepository.save(request);
  }
}
