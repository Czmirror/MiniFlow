import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { validateEmail } from "./validation/validateEmail.js";
import { validatePassword } from "./validation/validatePassword.js";
import { verifyPassword } from "../../infrastructure/auth/password.js";

export async function loginUser(
  repository: UserRepository,
  input: { email: string; password: string }
) {
  const email = validateEmail(input.email);
  const password = validatePassword(input.password);

  const user = await repository.findByEmail(email);
  if (!user) {
    throw new InputValidationError("invalid email or password");
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    throw new InputValidationError("invalid email or password");
  }

  return user;
}
