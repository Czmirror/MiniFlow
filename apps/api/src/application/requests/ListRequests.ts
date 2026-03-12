import { InputValidationError } from "../errors/InputValidationError.js";
import type { NormalizedListRequestsInput, RequestRepository } from "../ports/RequestRepository.js";
import type { ListRequestsInput } from "@miniflow/shared";

/**
 * Deleted filtering defaults live here so HTTP and future non-HTTP callers keep
 * the same listing semantics.
 */
export async function listRequests(repository: RequestRepository, input: ListRequestsInput) {
  validateRequiredString(input.teamId, "teamId");

  const page = input.page ?? 1;
  const limit = input.limit ?? 20;

  if (input.from && Number.isNaN(Date.parse(input.from))) {
    throw new InputValidationError("from must be a valid ISO datetime");
  }

  if (input.to && Number.isNaN(Date.parse(input.to))) {
    throw new InputValidationError("to must be a valid ISO datetime");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new InputValidationError("page must be a positive integer");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new InputValidationError("limit must be between 1 and 100");
  }

  const normalizedInput: NormalizedListRequestsInput = {
    teamId: input.teamId.trim(),
    status: input.status,
    includeDeleted: input.includeDeleted ?? false,
    from: input.from,
    to: input.to,
    page,
    limit
  };

  return repository.list(normalizedInput);
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
