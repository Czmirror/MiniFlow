/** 固定の使い捨てDBへ架空ユーザーを投入する。既存環境変数は使わず、初期化済みなら拒否する。 */
import { PrismaClient } from "../../apps/api/node_modules/@prisma/client";
import { PrismaUserRepository } from "../../apps/api/src/infrastructure/repositories/PrismaUserRepository";
import { seedTestUsers, userIds } from "./http";

const prisma = new PrismaClient({ datasourceUrl: "postgresql://miniflow_container_test@127.0.0.1:55449/miniflow_container_test", log: [] });
try {
  if (await prisma.userRecord.count() !== 0 || await prisma.requestRecord.count() !== 0) {
    throw new Error("container E2E database must be empty");
  }
  const users = new PrismaUserRepository(prisma);
  await seedTestUsers(users);
  for (const id of Object.values(userIds)) await users.updateProfile({ id, language: "ja" });
  console.log("Container E2E users seeded");
} finally {
  await prisma.$disconnect();
}
