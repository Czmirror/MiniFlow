/** 削除操作の表示条件。APIの認可の代わりにはせず、同じteamの本人または管理者の編集可能な申請だけを示す。 */
import type { AuthUserDto, RequestDto } from "@miniflow/shared";

/** 下書き・差し戻しだけを許可する。本人情報や選択申請がなければ操作を表示しない。 */
export function canDeleteRequest(request: RequestDto | null, user: AuthUserDto | null): boolean {
  return !!request && !!user && request.teamId === user.teamId
    && (request.createdBy === user.id || user.role === "Admin")
    && (request.status === "Draft" || request.status === "Rejected");
}
