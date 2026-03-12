import { randomUUID } from "node:crypto";
import type { RequestRepository } from "../ports/RequestRepository.js";
import { InputValidationError } from "../errors/InputValidationError.js";
import { Request } from "../../domain/request/Request.js";

const DEFAULT_CREATED_BY = "00000000-0000-0000-0000-000000000001";

export type CreateRequestInput = {
  teamId: string;
  title: string;
  body: string;
};

/**
 * createdBy is intentionally injected here until authentication exists.
 * Replace this with authenticated actor resolution instead of widening the API body.
 */
export async function createRequest(
  repository: RequestRepository,
  input: CreateRequestInput
): Promise<Request> {
  validateRequiredString(input.teamId, "teamId");
  validateRequiredString(input.title, "title");
  validateRequiredString(input.body, "body");

  const request = Request.createDraft({
    id: randomUUID(),
    teamId: input.teamId.trim(),
    createdBy: DEFAULT_CREATED_BY,
    title: input.title.trim(),
    body: input.body.trim()
  });

  return repository.create(request);
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
