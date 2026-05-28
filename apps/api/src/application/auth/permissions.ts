import type { UserRole } from "../../domain/user/User.js";

export function canSubmitRequest(input: { actorId: string; actorRole: UserRole; createdBy: string }): boolean {
  return input.actorRole === "Admin" || input.actorId === input.createdBy;
}

export function canApproveRequest(input: { actorId: string; actorRole: UserRole; createdBy: string }): boolean {
  if (input.actorId === input.createdBy) {
    return false;
  }

  return input.actorRole === "Approver" || input.actorRole === "Admin";
}
