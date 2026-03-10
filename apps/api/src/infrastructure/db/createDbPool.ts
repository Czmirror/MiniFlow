import { Pool } from "pg";

export function createDbPool(connectionString: string) {
  return new Pool({
    connectionString
  });
}
