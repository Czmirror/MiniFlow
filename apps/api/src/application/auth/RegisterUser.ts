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
  input: { email: string; password: string; displayName?: string | null; language?: "ja" | "en"; teamId?: string }
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
    passwordHash,
    displayName: normalizeOptionalText(input.displayName),
    language: input.language ?? "ja",
    teamId: normalizeRequiredText(input.teamId ?? "team-1", "teamId"),
    isActive: true
  });
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new StateConflictError(`${fieldName} is required`);
  }

  return trimmed;
}
