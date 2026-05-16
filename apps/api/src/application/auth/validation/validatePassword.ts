import { InputValidationError } from "../../errors/InputValidationError.js";

export function validatePassword(password: string): string {
  if (typeof password !== "string" || password.length === 0) {
    throw new InputValidationError("password is required");
  }

  if (password.length < 8) {
    throw new InputValidationError("password must be at least 8 characters");
  }

  return password;
}
