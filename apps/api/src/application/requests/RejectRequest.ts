import { randomUUID } from "node:crypto";
import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";
import { DEFAULT_ACTOR_ID } from "./actor.js";

export async function rejectRequest(
  repository: RequestRepository,
  input: { id: string; reason?: string }
) {
  validateRequiredString(input.id, "request id");

  const request = await repository.findById(input.id.trim());
  if (!request) {
    return null;
  }

  const result = request.reject({
    actorId: DEFAULT_ACTOR_ID,
    approvalId: randomUUID(),
    reason: input.reason
  });

  return repository.reject(result.request, result.approval);
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
