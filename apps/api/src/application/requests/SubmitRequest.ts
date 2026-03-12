import { InputValidationError } from "../errors/InputValidationError.js";
import type { RequestRepository } from "../ports/RequestRepository.js";

export async function submitRequest(repository: RequestRepository, id: string) {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new InputValidationError("request id is required");
  }

  const request = await repository.findById(id.trim());
  if (!request) {
    return null;
  }

  return repository.update(request.submit());
}
