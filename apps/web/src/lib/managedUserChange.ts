/** 管理者の更新応答が現在の画面所属に与える影響を判定する。通信や画面状態の変更は行わない。 */
import type { AuthUserDto } from "@miniflow/shared";

/** 本人のteamまたはroleが変わる場合だけ未保存申請を破棄する。表示名・言語だけなら維持する。 */
export function managedUserChange(current: AuthUserDto, updated: AuthUserDto): "other" | "profile" | "context" {
  if (current.id !== updated.id) return "other";
  return current.teamId !== updated.teamId || current.role !== updated.role ? "context" : "profile";
}
