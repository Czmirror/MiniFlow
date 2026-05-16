export function getEnv() {
  return {
    databaseUrl:
      process.env.DATABASE_URL ?? "postgresql://miniflow:miniflow@localhost:5432/miniflow",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3100",
    jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me"
  };
}
