import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { InputValidationError } from "../../../application/errors/InputValidationError.js";
import { createRequest } from "../../../application/requests/CreateRequest.js";
import { PrismaRequestRepository } from "../../../infrastructure/repositories/PrismaRequestRepository.js";

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

      return reply.code(201).send({
        id: createdRequest.id,
        teamId: createdRequest.teamId,
        createdBy: createdRequest.createdBy,
        title: createdRequest.title,
        body: createdRequest.body,
        status: createdRequest.status,
        createdAt: createdRequest.createdAt.toISOString(),
        updatedAt: createdRequest.updatedAt.toISOString(),
        deletedAt: createdRequest.deletedAt ? createdRequest.deletedAt.toISOString() : null
      });
    } catch (error) {
      if (error instanceof InputValidationError) {
        return reply.code(error.statusCode).send({
          error: {
            code: "INVALID_INPUT",
            message: error.message,
            status: error.statusCode
          }
        });
      }

      request.log.error(error);

      return reply.code(500).send({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "failed to create request",
          status: 500
        }
      });
    }
  });
}
