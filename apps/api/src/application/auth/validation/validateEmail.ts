import { InputValidationError } from "../../errors/InputValidationError.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string {
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new InputValidationError("email is required");
  }

  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized)) {
    throw new InputValidationError("email must be valid");
  }

  return normalized;
}
