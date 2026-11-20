/**
 * 本番のHTTPとPrisma保存先を、固定の使い捨てPostgreSQLへ接続する試験入口。
 * 空の試験DBに架空ユーザーを作り、API終了時にDB接続を閉じる。
 * 既存の環境変数や.envから接続先を読み込まず、migrationは起動手順で適用する。
 */
import { PrismaClient } from "../../apps/api/node_modules/@prisma/client";
import { createHttpServer } from "../../apps/api/src/presentation/http/createHttpServer";
import { getEnv } from "../../apps/api/src/infrastructure/config/env";
import { PrismaUserRepository } from "../../apps/api/src/infrastructure/repositories/PrismaUserRepository";
import { PrismaRequestRepository } from "../../apps/api/src/infrastructure/repositories/PrismaRequestRepository";
import { seedTestUsers, userIds } from "./http";

async function main() {
  const databaseUrl = "postgresql://miniflow_browser_test@127.0.0.1:55439/miniflow_browser_test";
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl, log: [] });
  try {
    const users = new PrismaUserRepository(prisma);
    // 初期化済みのDBへの重複投入を避け、API再起動後も申請・判断履歴を確認できるようにする。
    if (await prisma.userRecord.count() === 0) await seedTestUsers(users);
    for (const id of Object.values(userIds)) await users.updateProfile({ id, language: "ja" });
    const env = getEnv({
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "isolated-postgres-browser-only-key",
      HOST: "127.0.0.1",
      PORT: "43131",
      CORS_ORIGIN: "http://127.0.0.1:43130",
      API_ALLOWED_HOSTS: "127.0.0.1:43131"
    });
    const server = await createHttpServer({
      env,
      userRepository: users,
      requestRepository: new PrismaRequestRepository(prisma)
    });
    server.addHook("onClose", async () => { await prisma.$disconnect(); });
    process.once("SIGINT", () => { void server.close(); });
    process.once("SIGTERM", () => { void server.close(); });
    await server.listen({ host: env.host, port: env.port });
    console.log("PostgreSQL browser test API ready at http://127.0.0.1:43131");
  } catch {
    await prisma.$disconnect();
    console.error("PostgreSQL browser test API could not start. Check the isolated DB and migration steps.");
    process.exitCode = 1;
  }
}

void main();
