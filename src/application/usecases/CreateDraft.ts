import type { RequestRepository } from "../ports/RequestRepository";
import { Request } from "../../domain/request/Request";

export class CreateDraft {
  constructor(private readonly requestRepository: RequestRepository) {}

  async execute(input: {
    requestId: string;
    teamId: string;
    createdBy: string;
    title: string;
    body: string;
  }): Promise<Request> {
    const request = new Request({
      id: input.requestId,
      teamId: input.teamId,
      createdBy: input.createdBy,
      title: input.title,
      body: input.body
    });

    await this.requestRepository.save(request);
    return request;
  }
}
