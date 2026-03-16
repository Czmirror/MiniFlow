import type { Prisma, PrismaClient } from "@prisma/client";
import type { RequestRepository, NormalizedListRequestsInput } from "../../application/ports/RequestRepository.js";
import { Approval } from "../../domain/request/Approval.js";
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
      where: { id },
      include: {
        approvals: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
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
      deletedAt: record.deletedAt,
      approvals: record.approvals.map((approval) => this.toDomainApproval(approval))
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
      deletedAt: record.deletedAt,
      approvals: request.approvals
    });
  }

  /**
   * approve/reject must update request state and append audit history together.
   * Keep both writes in one transaction so status and approvals cannot diverge.
   */
  async approve(request: Request, approval: Approval): Promise<Request> {
    return this.persistDecision(request, approval);
  }

  async reject(request: Request, approval: Approval): Promise<Request> {
    return this.persistDecision(request, approval);
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
        include: {
          approvals: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
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
          deletedAt: record.deletedAt,
          approvals: record.approvals.map((approval) => this.toDomainApproval(approval))
        })
      ),
      page: input.page,
      limit: input.limit,
      total
    };
  }

  private async persistDecision(request: Request, approval: Approval): Promise<Request> {
    const [requestRecord] = await this.prisma.$transaction([
      this.prisma.requestRecord.update({
        where: {
          id: request.id
        },
        data: {
          status: request.status,
          updatedAt: request.updatedAt,
          deletedAt: request.deletedAt
        }
      }),
      this.prisma.approvalRecord.create({
        data: {
          id: approval.id,
          requestId: approval.requestId,
          actedBy: approval.actedBy,
          actionType: approval.actionType,
          reason: approval.reason,
          createdAt: approval.createdAt
        }
      })
    ]);

    return Request.rehydrate({
      id: requestRecord.id,
      teamId: requestRecord.teamId,
      createdBy: requestRecord.createdBy,
      title: requestRecord.title,
      body: requestRecord.body,
      status: requestRecord.status,
      createdAt: requestRecord.createdAt,
      updatedAt: requestRecord.updatedAt,
      deletedAt: requestRecord.deletedAt,
      approvals: request.approvals
    });
  }

  private toDomainApproval(record: {
    id: string;
    requestId: string;
    actedBy: string;
    actionType: "Approved" | "Rejected";
    reason: string | null;
    createdAt: Date;
  }): Approval {
    return new Approval({
      id: record.id,
      requestId: record.requestId,
      actedBy: record.actedBy,
      actionType: record.actionType,
      reason: record.reason,
      createdAt: record.createdAt
    });
  }
}
