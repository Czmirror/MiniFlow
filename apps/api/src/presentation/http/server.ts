import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerHealthRoute } from "./routes/health.js";
import { getEnv } from "../../infrastructure/config/env.js";
import { createDbPool } from "../../infrastructure/db/createDbPool.js";

export async function buildServer() {
  const env = getEnv();
  const dbPool = createDbPool(env.databaseUrl);
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: env.corsOrigin
  });

  server.addHook("onClose", async () => {
    await dbPool.end();
  });

  registerHealthRoute(server, dbPool);

  return server;
}
