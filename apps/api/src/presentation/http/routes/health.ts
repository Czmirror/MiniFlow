import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { checkHealth } from "../../../application/health/checkHealth.js";

export function registerHealthRoute(server: FastifyInstance, dbPool: Pool) {
  server.get("/health", async () => {
    return checkHealth(dbPool);
  });
}
