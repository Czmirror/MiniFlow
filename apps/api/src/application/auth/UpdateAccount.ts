/** アカウントの編集可能なprofileだけを更新する。省略fieldは保存先でも維持される。 */
import type { UserRepository } from "../ports/UserRepository.js";
import { optionalDisplayName, optionalLanguage, requiredText } from "./validation/profile.js";

/** 自分のprofileを更新し、不在ならnull、入力違反なら400を返す。認可済みuserIdを受け取る。 */
export async function updateAccount(
  repository: UserRepository,
  input: { userId: string; displayName?: string | null; language?: "ja" | "en" }
) {
  const id = requiredText(input.userId, "user id");
  const displayName = optionalDisplayName(input.displayName);
  const language = optionalLanguage(input.language);
  if (!await repository.findById(id)) return null;
  return repository.updateProfile({ id, displayName, language });
}
