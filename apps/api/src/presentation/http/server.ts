import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify from "fastify";
import { registerHealthRoute } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerRequestRoutes } from "./routes/requests.js";
import { getEnv } from "../../infrastructure/config/env.js";
import { createDbPool } from "../../infrastructure/db/createDbPool.js";
import { prisma } from "../../infrastructure/db/prisma.js";
import { PrismaUserRepository } from "../../infrastructure/repositories/PrismaUserRepository.js";
import { authPlugin } from "./plugins/auth.js";

export async function buildServer() {
  const env = getEnv();
  const dbPool = createDbPool(env.databaseUrl);
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH"]
  });
  await server.register(cookie);
  await server.register(jwt, {
    secret: env.jwtSecret,
    cookie: {
      cookieName: "miniflow_auth",
      signed: false
    }
  });
  await server.register(authPlugin, {
    userRepository: new PrismaUserRepository(prisma)
  });

  server.addHook("onClose", async () => {
    await prisma.$disconnect();
    await dbPool.end();
  });

  registerHealthRoute(server, dbPool);
  registerAuthRoutes(server, prisma);
  registerRequestRoutes(server, prisma);

  return server;
}
