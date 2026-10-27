/** 現在パスワードの照合後に新hashを保存する。暗号処理の選択と認証cookieの破棄は呼び出し元が担当する。 */
import { InputValidationError } from "../errors/InputValidationError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import type { PasswordOperations } from "../ports/PasswordOperations.js";
import { validatePassword } from "./validation/validatePassword.js";

/** 存在しないユーザーはnull。不一致や暗号処理失敗では保存せず、例外を呼び出し元へ伝える。 */
export async function changePassword(
  repository: UserRepository,
  input: { userId: string; currentPassword: string; newPassword: string },
  passwords: PasswordOperations
) {
  const userId = normalizeRequiredString(input.userId, "user id");
  const currentPassword = validatePassword(input.currentPassword);
  const newPassword = validatePassword(input.newPassword);

  const existingUser = await repository.findById(userId);
  if (!existingUser) {
    return null;
  }

  const matches = await passwords.verifyPassword(currentPassword, existingUser.passwordHash);
  if (!matches) {
    throw new InputValidationError("current password is invalid");
  }

  return repository.updatePassword({
    id: userId,
    passwordHash: await passwords.hashPassword(newPassword)
  });
}

function normalizeRequiredString(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputValidationError(`${fieldName} is required`);
  }

  return value.trim();
}
