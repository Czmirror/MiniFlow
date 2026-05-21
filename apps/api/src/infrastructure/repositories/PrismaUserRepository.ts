import type { UserRepository } from "../../application/ports/UserRepository.js";
import { User } from "../../domain/user/User.js";
import { prisma as prismaClient } from "../db/prisma.js";

/**
 * User persistence stays separate from workflow persistence so auth changes do
 * not leak into request repositories.
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: typeof prismaClient) {}

  async create(input: {
    id: string;
    email: string;
    passwordHash: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    isActive?: boolean;
  }): Promise<User> {
    const record = await this.prisma.userRecord.create({
      data: input
    });

    return this.toDomain(record);
  }

  async updateProfile(input: {
    id: string;
    displayName?: string | null;
    language?: "ja" | "en";
    teamId?: string;
    isActive?: boolean;
  }): Promise<User> {
    const record = await this.prisma.userRecord.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName,
        language: input.language,
        teamId: input.teamId,
        isActive: input.isActive
      }
    });

    return this.toDomain(record);
  }

  async updatePassword(input: { id: string; passwordHash: string }): Promise<User> {
    const record = await this.prisma.userRecord.update({
      where: { id: input.id },
      data: {
        passwordHash: input.passwordHash
      }
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

  async list(): Promise<User[]> {
    const records = await this.prisma.userRecord.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string | null;
    language: string;
    teamId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(record);
  }
}
