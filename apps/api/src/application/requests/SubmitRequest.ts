import { InputValidationError } from "../errors/InputValidationError.js";
import { AuthorizationError } from "../errors/AuthorizationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";
import type { UserRole } from "../../domain/user/User.js";
import { canSubmitRequest } from "../auth/permissions.js";

export async function submitRequest(
  repository: RequestRepository,
  input: { id: string; actorId: string; actorRole: UserRole }
) {
  validateRequiredString(input.id, "request id");
  validateRequiredString(input.actorId, "actorId");

  const request = await repository.findById(input.id.trim());
  if (!request) {
    return null;
  }
  if (!canSubmitRequest({ actorId: input.actorId.trim(), actorRole: input.actorRole, createdBy: request.createdBy })) {
    throw new AuthorizationError("submit is only allowed by requester or admin");
  }

  return repository.update(request.submit());
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
