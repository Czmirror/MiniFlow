import type { UserRepository } from "../ports/UserRepository.js";

export async function listUsers(repository: UserRepository) {
  return repository.list();
}
