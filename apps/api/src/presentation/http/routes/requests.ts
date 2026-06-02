import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { ListRequestsInput } from "@miniflow/shared";
import { InputValidationError } from "../../../application/errors/InputValidationError.js";
import { StateConflictError } from "../../../application/errors/StateConflictError.js";
import { AuthorizationError } from "../../../application/errors/AuthorizationError.js";
import { createRequest } from "../../../application/requests/CreateRequest.js";
import { approveRequest } from "../../../application/requests/ApproveRequest.js";
import { deleteRequest } from "../../../application/requests/DeleteRequest.js";
import { getRequestById } from "../../../application/requests/GetRequestById.js";
import { listRequests } from "../../../application/requests/ListRequests.js";
import { rejectRequest } from "../../../application/requests/RejectRequest.js";
import { reviseRequest } from "../../../application/requests/ReviseRequest.js";
import { submitRequest } from "../../../application/requests/SubmitRequest.js";
import { updateRequest } from "../../../application/requests/UpdateRequest.js";
import { PrismaRequestRepository } from "../../../infrastructure/repositories/PrismaRequestRepository.js";
import { toRequestDetailDto, toRequestDto } from "../mappers/toRequestDto.js";

/**
 * Routes stay thin on purpose. If a request workflow rule changes, update the
 * use case or domain first and keep this file focused on HTTP translation.
 */
export function registerRequestRoutes(server: FastifyInstance, prisma: PrismaClient) {
  const repository = new PrismaRequestRepository(prisma);

  server.post("/requests", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{
      title: string;
      body: string;
    }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const createdRequest = await createRequest(repository, {
        actorId: request.currentUser.id,
        teamId: request.currentUser.teamId,
        title: body.title ?? "",
        body: body.body ?? ""
      });

      return reply.code(201).send(toRequestDto(createdRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to create request");
    }
  });

  server.get("/requests/:id", { preHandler: [server.requireAuth] }, async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const foundRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );

      if (!foundRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDetailDto(foundRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to fetch request");
    }
  });

  server.get("/requests", { preHandler: [server.requireAuth] }, async (request, reply) => {
    const query = request.query as Partial<{
      status: ListRequestsInput["status"];
      includeDeleted: string;
      from: string;
      to: string;
      page: string;
      limit: string;
    }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const response = await listRequests(repository, {
        teamId: request.currentUser.teamId,
        status: query.status,
        includeDeleted: query.includeDeleted === "true",
        from: query.from,
        to: query.to,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined
      });

      return reply.send({
        items: response.items.map(toRequestDto),
        page: response.page,
        limit: response.limit,
        total: response.total
      });
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to list requests");
    }
  });

  server.patch("/requests/:id", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };
    const body = (request.body ?? {}) as Partial<{
      title: string;
      body: string;
    }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }
      ensureRequesterOrAdmin(currentRequest, request.currentUser);

      const updatedRequest = await updateRequest(repository, {
        id: params.id ?? "",
        title: body.title,
        body: body.body
      });

      if (!updatedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(updatedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to update request");
    }
  });

  server.post("/requests/:id/submit", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }

      const submittedRequest = await submitRequest(repository, {
        id: params.id ?? "",
        actorId: request.currentUser.id,
        actorRole: request.currentUser.role
      });

      if (!submittedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(submittedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to submit request");
    }
  });

  server.post("/requests/:id/approve", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };
    const body = (request.body ?? {}) as Partial<{ reason: string }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }

      const approvedRequest = await approveRequest(repository, {
        id: params.id ?? "",
        actorId: request.currentUser.id,
        actorRole: request.currentUser.role,
        reason: body.reason
      });

      if (!approvedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(approvedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to approve request");
    }
  });

  server.post("/requests/:id/reject", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };
    const body = (request.body ?? {}) as Partial<{ reason: string }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }

      const rejectedRequest = await rejectRequest(repository, {
        id: params.id ?? "",
        actorId: request.currentUser.id,
        actorRole: request.currentUser.role,
        reason: body.reason
      });

      if (!rejectedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(rejectedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to reject request");
    }
  });

  server.post("/requests/:id/revise", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }
      ensureRequesterOrAdmin(currentRequest, request.currentUser);

      const revisedRequest = await reviseRequest(repository, params.id ?? "");

      if (!revisedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(revisedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to revise request");
    }
  });

  server.post("/requests/:id/delete", { preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      if (!request.currentUser) {
        return reply.code(401).send(notAuthorizedError());
      }

      const currentRequest = await ensureRequestBelongsToCurrentTeam(
        repository,
        params.id ?? "",
        request.currentUser.teamId
      );
      if (!currentRequest) {
        return reply.code(404).send(notFoundError());
      }
      ensureRequesterOrAdmin(currentRequest, request.currentUser);

      const deletedRequest = await deleteRequest(repository, params.id ?? "");

      if (!deletedRequest) {
        return reply.code(404).send(notFoundError());
      }

      return reply.send(toRequestDto(deletedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to delete request");
    }
  });
}

async function ensureRequestBelongsToCurrentTeam(
  repository: PrismaRequestRepository,
  id: string,
  currentTeamId: string
) {
  const foundRequest = await getRequestById(repository, id);
  if (!foundRequest) {
    return null;
  }

  if (foundRequest.teamId !== currentTeamId) {
    throw new AuthorizationError("request belongs to another team");
  }

  return foundRequest;
}

function ensureRequesterOrAdmin(
  foundRequest: Awaited<ReturnType<typeof getRequestById>>,
  currentUser: NonNullable<FastifyRequest["currentUser"]>
) {
  if (!foundRequest) {
    return;
  }

  if (foundRequest.createdBy !== currentUser.id && currentUser.role !== "Admin") {
    throw new AuthorizationError("request edits are only allowed by requester or admin");
  }
}

function handleRouteError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof InputValidationError) {
    const statusCode = error.statusCode;
    return reply.code(statusCode).send({
      error: {
        code: "INVALID_INPUT",
        message: error.message,
        status: statusCode
      }
    });
  }

  if (error instanceof StateConflictError) {
    return reply.code(error.statusCode).send({
      error: {
        code: "STATE_CONFLICT",
        message: error.message,
        status: error.statusCode
      }
    });
  }

  if (error instanceof AuthorizationError) {
    return reply.code(error.statusCode).send({
      error: {
        code: "FORBIDDEN",
        message: error.message,
        status: error.statusCode
      }
    });
  }

  request.log.error(error);

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: fallbackMessage,
      status: 500
    }
  });
}

function notFoundError() {
  return {
    error: {
      code: "NOT_FOUND",
      message: "request not found",
      status: 404
    }
  };
}

function notAuthorizedError() {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "authentication required",
      status: 401
    }
  };
}
