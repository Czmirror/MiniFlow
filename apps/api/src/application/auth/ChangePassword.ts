import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { hashPassword, verifyPassword } from "../../infrastructure/auth/password.js";
import { validatePassword } from "./validation/validatePassword.js";

export async function changePassword(
  repository: UserRepository,
  input: { userId: string; currentPassword: string; newPassword: string }
) {
  const userId = normalizeRequiredString(input.userId, "user id");
  const currentPassword = validatePassword(input.currentPassword);
  const newPassword = validatePassword(input.newPassword);

  const existingUser = await repository.findById(userId);
  if (!existingUser) {
    return null;
  }

  const matches = await verifyPassword(currentPassword, existingUser.passwordHash);
  if (!matches) {
    throw new InputValidationError("current password is invalid");
  }

  return repository.updatePassword({
    id: userId,
    passwordHash: await hashPassword(newPassword)
  });
}

function normalizeRequiredString(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }

  return value.trim();
}
