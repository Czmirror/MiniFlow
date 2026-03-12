import type { RequestDto } from "@miniflow/shared";
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
