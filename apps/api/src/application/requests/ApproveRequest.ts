import { randomUUID } from "node:crypto";
import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";
import { DEFAULT_ACTOR_ID } from "./actor.js";

/**
 * Approval currently uses a fixed actor until authentication exists.
 * When auth is introduced, only the actor source should change here.
 */
export async function approveRequest(
  repository: RequestRepository,
  input: { id: string; reason?: string }
) {
  validateRequiredString(input.id, "request id");

  const request = await repository.findById(input.id.trim());
  if (!request) {
    return null;
  }

  const result = request.approve({
    actorId: DEFAULT_ACTOR_ID,
    approvalId: randomUUID(),
    reason: input.reason
  });

  return repository.approve(result.request, result.approval);
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
