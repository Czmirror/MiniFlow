/** 管理者から受け取ったユーザーprofileの更新値を検証する。管理者認可はHTTP入口が担当する。 */
import type { UserRepository } from "../ports/UserRepository.js";
import type { UserRole } from "../../domain/user/User.js";
import { optionalActive, optionalDisplayName, optionalLanguage, optionalRole, requiredText } from "./validation/profile.js";

/** 未指定fieldは変更せず、不在ならnull。型・列挙値の違反は400。 */
export async function updateUser(repository: UserRepository, input: {
  id: string; displayName?: string | null; language?: "ja" | "en";
  teamId?: string; role?: UserRole; isActive?: boolean;
}) {
  const id = requiredText(input.id, "user id");
  const update = {
    id,
    displayName: optionalDisplayName(input.displayName),
    language: optionalLanguage(input.language),
    teamId: input.teamId === undefined ? undefined : requiredText(input.teamId, "teamId"),
    role: optionalRole(input.role),
    isActive: optionalActive(input.isActive)
  };
  if (!await repository.findById(id)) return null;
  return repository.updateProfile(update);
}
