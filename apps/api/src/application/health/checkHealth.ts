import type { HealthResponse } from "@miniflow/shared";
import type { Pool } from "pg";

export async function checkHealth(dbPool: Pool): Promise<HealthResponse> {
  try {
    await dbPool.query("select 1");
    return {
      status: "ok",
      service: "api",
      db: "connected"
    };
  } catch {
    return {
      status: "ok",
      service: "api",
      db: "disconnected"
    };
  }
}
