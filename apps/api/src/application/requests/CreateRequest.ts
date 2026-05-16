import { randomUUID } from "node:crypto";
import type { RequestRepository } from "../ports/RequestRepository.js";
import { InputValidationError } from "../errors/InputValidationError.js";
import { Request } from "../../domain/request/Request.js";

export type CreateRequestInput = {
  actorId: string;
  teamId: string;
  title: string;
  body: string;
};

/**
 * createdBy stays outside the request body. When auth changes, update the actor
 * resolution at the route or middleware boundary instead of widening this API contract.
 */
export async function createRequest(
  repository: RequestRepository,
  input: CreateRequestInput
): Promise<Request> {
  validateRequiredString(input.teamId, "teamId");
  validateRequiredString(input.title, "title");
  validateRequiredString(input.body, "body");
  validateRequiredString(input.actorId, "actorId");

  const request = Request.createDraft({
    id: randomUUID(),
    teamId: input.teamId.trim(),
    createdBy: input.actorId.trim(),
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
