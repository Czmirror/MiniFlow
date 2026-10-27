/** 管理者HTTPとローカルCLIからユーザーを新規作成する。公開signupの入口は持たない。 */
import { randomUUID } from "node:crypto";
import { StateConflictError } from "../../domain/errors/StateConflictError.js";
import type { UserRepository } from "../ports/UserRepository.js";
import { validateEmail } from "./validation/validateEmail.js";
import { validatePassword } from "./validation/validatePassword.js";
import type { PasswordOperations } from "../ports/PasswordOperations.js";
import { optionalDisplayName, optionalLanguage, optionalRole, requiredText } from "./validation/profile.js";
import type { UserRole } from "../../domain/user/User.js";

/**
 * 入力検証と重複確認後に注入された操作でhashを作り、ユーザーを保存する。
 * 既存emailは競合例外、hash作成の失敗は未保存のまま呼び出し元へ伝える。
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
  },
  passwords: Pick<PasswordOperations, "hashPassword">
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

  const passwordHash = await passwords.hashPassword(password);
  return repository.create({
    id: randomUUID(),
    email,
    passwordHash,
    ...profile,
    isActive: true
  });
}
