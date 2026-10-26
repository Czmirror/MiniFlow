/** productionの保存先とHTTPを接続し、DB resourceの終了処理を所有する。 */
import { createHttpServer } from "./createHttpServer.js";
import { registerHealthRoute } from "./routes/health.js";
import { getEnv, type AppEnv } from "../../infrastructure/config/env.js";
import { createDbPool } from "../../infrastructure/db/createDbPool.js";
import { prisma } from "../../infrastructure/db/prisma.js";
import { PrismaUserRepository } from "../../infrastructure/repositories/PrismaUserRepository.js";
import { PrismaRequestRepository } from "../../infrastructure/repositories/PrismaRequestRepository.js";

/** 起動設定を検証し、既存DBへ接続するserverを構築する。migrationは適用しない。 */
export async function buildServer(env: AppEnv = getEnv()) {
  const server = await createHttpServer({ env, logger: true, userRepository: new PrismaUserRepository(prisma), requestRepository: new PrismaRequestRepository(prisma) });
  const dbPool = createDbPool(env.databaseUrl);
  server.addHook("onClose", async () => { await prisma.$disconnect(); await dbPool.end(); });
  registerHealthRoute(server, dbPool);
  return server;
}
