import type { UserRepository } from "../ports/UserRepository.js";

export async function getCurrentUser(repository: UserRepository, userId: string) {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    return null;
  }

  return repository.findById(userId.trim());
}
