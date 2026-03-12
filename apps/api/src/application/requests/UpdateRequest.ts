import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";

export type UpdateRequestInput = {
  id: string;
  title?: string;
  body?: string;
};

export async function updateRequest(repository: RequestRepository, input: UpdateRequestInput) {
  validateRequiredString(input.id, "request id");

  if (typeof input.title !== "string" && typeof input.body !== "string") {
    throw new InputValidationError("title or body is required");
  }

  const request = await repository.findById(input.id.trim());
  if (!request) {
    return null;
  }

  const nextRequest = request.update({
    title: typeof input.title === "string" ? input.title : undefined,
    body: typeof input.body === "string" ? input.body : undefined
  });

  return repository.update(nextRequest);
}

function validateRequiredString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }
}
