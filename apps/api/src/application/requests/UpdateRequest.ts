/** Draftの編集内容を検証して保存する。空白の指定値はドメインの一般例外に達する前に400で拒否する。 */
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

  for (const [field, value] of [["title", input.title], ["body", input.body]] as const) {
    if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      throw new InputValidationError(`${field} must not be empty`);
    }
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
