import { randomUUID } from "node:crypto";
import { StateConflictError } from "../errors/StateConflictError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { validateEmail } from "./validation/validateEmail.js";
import { validatePassword } from "./validation/validatePassword.js";
import { hashPassword } from "../../infrastructure/auth/password.js";

/**
 * Registration keeps validation local to auth until cross-domain validation rules
 * actually emerge. Do not generalize this into a framework prematurely.
 */
export async function registerUser(
  repository: UserRepository,
  input: { email: string; password: string }
) {
  const email = validateEmail(input.email);
  const password = validatePassword(input.password);

  const existingUser = await repository.findByEmail(email);
  if (existingUser) {
    throw new StateConflictError("email already exists");
  }

  const passwordHash = await hashPassword(password);
  return repository.create({
    id: randomUUID(),
    email,
    passwordHash
  });
}
