import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import type { UserRole } from "../../domain/user/User.js";

export async function updateUser(
  repository: UserRepository,
  input: {
    id: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    role?: UserRole;
    isActive?: boolean;
  }
) {
  const id = normalizeRequiredString(input.id, "user id");
  const existingUser = await repository.findById(id);
  if (!existingUser) {
    return null;
  }

  return repository.updateProfile({
    id,
    displayName: normalizeOptionalString(input.displayName),
    language: input.language,
    teamId: typeof input.teamId === "string" ? normalizeRequiredString(input.teamId, "teamId") : undefined,
    role: input.role,
    isActive: input.isActive
  });
}

function normalizeRequiredString(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
