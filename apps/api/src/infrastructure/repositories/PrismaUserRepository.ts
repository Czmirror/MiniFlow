import type { UserRepository } from "../../application/ports/UserRepository.js";
import { User } from "../../domain/user/User.js";
import { prisma as prismaClient } from "../db/prisma.js";

/**
 * User persistence stays separate from workflow persistence so auth changes do
 * not leak into request repositories.
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: typeof prismaClient) {}

  async create(input: { id: string; email: string; passwordHash: string }): Promise<User> {
    const record = await this.prisma.userRecord.create({
      data: input
    });

    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.userRecord.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.userRecord.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(record);
  }
}
