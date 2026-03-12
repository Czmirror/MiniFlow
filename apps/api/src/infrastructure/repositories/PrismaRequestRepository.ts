import type { Prisma, PrismaClient } from "@prisma/client";
import type { RequestRepository, NormalizedListRequestsInput } from "../../application/ports/RequestRepository.js";
import { Request } from "../../domain/request/Request.js";

/**
 * Prisma mapping stays here so the domain model can evolve without leaking ORM
 * details into routes or use cases.
 */
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

  async findById(id: string): Promise<Request | null> {
    const record = await this.prisma.requestRecord.findUnique({
      where: { id }
    });

    if (!record) {
      return null;
    }

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

  async update(request: Request): Promise<Request> {
    const record = await this.prisma.requestRecord.update({
      where: {
        id: request.id
      },
      data: {
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

  async list(input: NormalizedListRequestsInput): Promise<{
    items: Request[];
    page: number;
    limit: number;
    total: number;
  }> {
    const where: Prisma.RequestRecordWhereInput = {
      teamId: input.teamId
    };

    if (!input.includeDeleted) {
      where.status = input.status ?? {
        not: "Deleted"
      };
    } else if (input.status) {
      where.status = input.status;
    }

    if (input.from || input.to) {
      where.createdAt = {};
      if (input.from) {
        where.createdAt.gte = new Date(input.from);
      }
      if (input.to) {
        where.createdAt.lte = new Date(input.to);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.requestRecord.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      this.prisma.requestRecord.count({ where })
    ]);

    return {
      items: records.map((record) =>
        Request.rehydrate({
          id: record.id,
          teamId: record.teamId,
          createdBy: record.createdBy,
          title: record.title,
          body: record.body,
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          deletedAt: record.deletedAt
        })
      ),
      page: input.page,
      limit: input.limit,
      total
    };
  }
}
