import type { PrismaClient } from "@prisma/client";
import type { RequestRepository } from "../../application/ports/RequestRepository.js";
import { Request } from "../../domain/request/Request.js";

export class PrismaRequestRepository implements RequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(request: Request): Promise<Request> {
    const record = await this.prisma.requestRecord.create({
      data: {
        id: request.id,
        teamId: request.teamId,
        createdBy: request.createdBy,
        title: request.title,
        body: request.body,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        deletedAt: request.deletedAt
      }
    });

    return Request.rehydrate({
      id: record.id,
      teamId: record.teamId,
      createdBy: record.createdBy,
      title: record.title,
      body: record.body,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt
    });
  }
}
