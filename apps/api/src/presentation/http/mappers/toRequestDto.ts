import type { ApprovalDto, RequestDetailDto, RequestDto } from "@miniflow/shared";
import type { Approval } from "../../../domain/request/Approval.js";
import type { Request } from "../../../domain/request/Request.js";

/**
 * Keep API response shaping in one place so schema changes do not spread across routes.
 */
export function toRequestDto(request: Request): RequestDto {
  return {
    id: request.id,
    teamId: request.teamId,
    createdBy: request.createdBy,
    title: request.title,
    body: request.body,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    deletedAt: request.deletedAt ? request.deletedAt.toISOString() : null
  };
}

export function toApprovalDto(approval: Approval): ApprovalDto {
  return {
    id: approval.id,
    requestId: approval.requestId,
    actedBy: approval.actedBy,
    actionType: approval.actionType,
    reason: approval.reason,
    createdAt: approval.createdAt.toISOString()
  };
}

/**
 * Detail responses intentionally separate current request state from audit history.
 * If detail screens later include more related data, extend this mapper instead of routes.
 */
export function toRequestDetailDto(request: Request): RequestDetailDto {
  return {
    request: toRequestDto(request),
    approvals: request.approvals.map(toApprovalDto)
  };
}
