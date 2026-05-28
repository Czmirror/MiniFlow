import { randomUUID } from "node:crypto";
import { AuthorizationError } from "../errors/AuthorizationError.js";
import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";
import type { UserRole } from "../../domain/user/User.js";
import { canApproveRequest } from "../auth/permissions.js";

/**
 * Approval uses actorId provided by authenticated context. Keep transport-specific
 * auth details out of this use case and pass only the resolved actor id.
 */
export async function approveRequest(
  repository: RequestRepository,
  input: { id: string; actorId: string; actorRole: UserRole; reason?: string }
) {
  validateRequiredString(input.id, "request id");
  validateRequiredString(input.actorId, "actorId");

  const request = await repository.findById(input.id.trim());
  if (!request) {
    return null;
  }
  if (!canApproveRequest({ actorId: input.actorId.trim(), actorRole: input.actorRole, createdBy: request.createdBy })) {
    throw new AuthorizationError("approve is only allowed by approver or admin, excluding requester");
  }

  const result = request.approve({
    actorId: input.actorId.trim(),
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
