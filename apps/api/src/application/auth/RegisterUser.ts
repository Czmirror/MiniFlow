/** 管理者HTTPとローカルCLIからユーザーを新規作成する。公開signupの入口は持たない。 */
import { randomUUID } from "node:crypto";
import { StateConflictError } from "../errors/StateConflictError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { validateEmail } from "./validation/validateEmail.js";
import { validatePassword } from "./validation/validatePassword.js";
import { hashPassword } from "../../infrastructure/auth/password.js";
import { optionalDisplayName, optionalLanguage, optionalRole, requiredText } from "./validation/profile.js";
import type { UserRole } from "../../domain/user/User.js";

/**
 * Registration keeps validation local to auth until cross-domain validation rules
 * actually emerge. Do not generalize this into a framework prematurely.
 */
export async function registerUser(
  repository: UserRepository,
  input: {
    email: string;
    password: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    role?: UserRole;
  }
) {
  const email = validateEmail(input.email);
  const password = validatePassword(input.password);

  const profile = {
    displayName: optionalDisplayName(input.displayName),
    language: optionalLanguage(input.language) ?? "ja",
    teamId: requiredText(input.teamId === undefined ? "team-1" : input.teamId, "teamId"),
    role: optionalRole(input.role) ?? "Applicant"
  };

  const existingUser = await repository.findByEmail(email);
  if (existingUser) {
    throw new StateConflictError("email already exists");
  }

  const passwordHash = await hashPassword(password);
  return repository.create({
    id: randomUUID(),
    email,
    passwordHash,
    ...profile,
    isActive: true
  });
}
