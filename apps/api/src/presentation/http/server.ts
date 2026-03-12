import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerHealthRoute } from "./routes/health.js";
import { registerRequestRoutes } from "./routes/requests.js";
import { getEnv } from "../../infrastructure/config/env.js";
import { createDbPool } from "../../infrastructure/db/createDbPool.js";
import { prisma } from "../../infrastructure/db/prisma.js";

export async function buildServer() {
  const env = getEnv();
  const dbPool = createDbPool(env.databaseUrl);
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: env.corsOrigin
  });

  server.addHook("onClose", async () => {
    await prisma.$disconnect();
    await dbPool.end();
  });

  registerHealthRoute(server, dbPool);
  registerRequestRoutes(server, prisma);

  return server;
}
