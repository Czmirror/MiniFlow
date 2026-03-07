import { ApplicationError } from "../errors/ApplicationError";
import type { RequestRepository } from "../ports/RequestRepository";

export class UpdateRequest {
  constructor(private readonly requestRepository: RequestRepository) {}

  async execute(input: { requestId: string; title?: string; body?: string }): Promise<void> {
    const request = await this.requestRepository.findById(input.requestId);
    if (!request) {
      throw new ApplicationError("request not found", 404, "NOT_FOUND");
    }

    request.update({ title: input.title, body: input.body });
    await this.requestRepository.save(request);
  }
}
