import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";

export async function updateAccount(
  repository: UserRepository,
  input: { userId: string; displayName?: string | null; language?: "ja" | "en" }
) {
  const userId = normalizeRequiredString(input.userId, "user id");
  const existingUser = await repository.findById(userId);
  if (!existingUser) {
    return null;
  }

  return repository.updateProfile({
    id: userId,
    displayName: normalizeOptionalString(input.displayName),
    language: normalizeLanguage(input.language)
  });
}

function normalizeRequiredString(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLanguage(language: "ja" | "en" | undefined): "ja" | "en" {
  return language === "en" ? "en" : "ja";
}
