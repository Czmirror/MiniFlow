/** ログイン入力とユーザー状態を検証し、注入された操作でパスワードを照合する。 */
import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { validateEmail } from "./validation/validateEmail.js";
import { validatePassword } from "./validation/validatePassword.js";
import type { PasswordOperations } from "../ports/PasswordOperations.js";

/** 一致する有効ユーザーを返す。入力不正・不一致は例外、照合の障害はそのまま呼び出し元へ伝える。 */
export async function loginUser(
  repository: UserRepository,
  input: { email: string; password: string },
  passwords: Pick<PasswordOperations, "verifyPassword">
) {
  const email = validateEmail(input.email);
  const password = validatePassword(input.password);

  const user = await repository.findByEmail(email);
  if (!user) {
    throw new InputValidationError("invalid email or password");
  }
  if (!user.isActive) {
    throw new InputValidationError("user is disabled");
  }

  const matches = await passwords.verifyPassword(password, user.passwordHash);
  if (!matches) {
    throw new InputValidationError("invalid email or password");
  }

  return user;
}
