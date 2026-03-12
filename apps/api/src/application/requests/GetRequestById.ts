import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";

export async function getRequestById(repository: RequestRepository, id: string) {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new InputValidationError("request id is required");
  }

  return repository.findById(id.trim());
}
