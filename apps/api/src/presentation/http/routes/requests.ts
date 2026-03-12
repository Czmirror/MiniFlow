import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { ListRequestsInput } from "@miniflow/shared";
import { InputValidationError } from "../../../application/errors/InputValidationError.js";
import { StateConflictError } from "../../../application/errors/StateConflictError.js";
import { createRequest } from "../../../application/requests/CreateRequest.js";
import { getRequestById } from "../../../application/requests/GetRequestById.js";
import { listRequests } from "../../../application/requests/ListRequests.js";
import { submitRequest } from "../../../application/requests/SubmitRequest.js";
import { updateRequest } from "../../../application/requests/UpdateRequest.js";
import { PrismaRequestRepository } from "../../../infrastructure/repositories/PrismaRequestRepository.js";
import { toRequestDto } from "../mappers/toRequestDto.js";

/**
 * Routes stay thin on purpose. If a request workflow rule changes, update the
 * use case or domain first and keep this file focused on HTTP translation.
 */
export function registerRequestRoutes(server: FastifyInstance, prisma: PrismaClient) {
  const repository = new PrismaRequestRepository(prisma);

  server.post("/requests", async (request, reply) => {
    const body = request.body as Partial<{
      teamId: string;
      title: string;
      body: string;
    }>;

    try {
      const createdRequest = await createRequest(repository, {
        teamId: body.teamId ?? "",
        title: body.title ?? "",
        body: body.body ?? ""
      });

      return reply.code(201).send(toRequestDto(createdRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to create request");
    }
  });

  server.get("/requests/:id", async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      const foundRequest = await getRequestById(repository, params.id ?? "");

      if (!foundRequest) {
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "request not found",
            status: 404
          }
        });
      }

      return reply.send(toRequestDto(foundRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to fetch request");
    }
  });

  server.get("/requests", async (request, reply) => {
    const query = request.query as Partial<{
      teamId: string;
      status: ListRequestsInput["status"];
      includeDeleted: string;
      from: string;
      to: string;
      page: string;
      limit: string;
    }>;

    try {
      const response = await listRequests(repository, {
        teamId: query.teamId ?? "",
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

  server.patch("/requests/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    const body = request.body as Partial<{
      title: string;
      body: string;
    }>;

    try {
      const updatedRequest = await updateRequest(repository, {
        id: params.id ?? "",
        title: body.title,
        body: body.body
      });

      if (!updatedRequest) {
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "request not found",
            status: 404
          }
        });
      }

      return reply.send(toRequestDto(updatedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to update request");
    }
  });

  server.post("/requests/:id/submit", async (request, reply) => {
    const params = request.params as { id?: string };

    try {
      const submittedRequest = await submitRequest(repository, params.id ?? "");

      if (!submittedRequest) {
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "request not found",
            status: 404
          }
        });
      }

      return reply.send(toRequestDto(submittedRequest));
    } catch (error) {
      return handleRouteError(request, reply, error, "failed to submit request");
    }
  });
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

  request.log.error(error);

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: fallbackMessage,
      status: 500
    }
  });
}
