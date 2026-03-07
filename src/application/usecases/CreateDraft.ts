import type { RequestRepository } from "../ports/RequestRepository";
import { Request } from "../../domain/request/Request";

export class CreateDraft {
  constructor(private readonly requestRepository: RequestRepository) {}

  async execute(input: { requestId: string; title: string; body: string }): Promise<Request> {
    const request = new Request({
      id: input.requestId,
      title: input.title,
      body: input.body
    });

    await this.requestRepository.save(request);
    return request;
  }
}
