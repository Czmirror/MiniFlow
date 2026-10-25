/** 起動設定を検証する。秘密の値そのものをエラーやログへ含めない。 */
export function getEnv(source: NodeJS.ProcessEnv = process.env) {
  const jwtSecret = source.JWT_SECRET;
  if (!jwtSecret?.trim()) throw new Error("JWT_SECRET is required");
  const port = Number(source.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port");
  let origin: URL;
  try { origin = new URL(source.CORS_ORIGIN ?? "http://localhost:3100"); }
  catch { throw new Error("CORS_ORIGIN must be an HTTP origin"); }
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("CORS_ORIGIN must be an HTTP origin");
  }
  const allowedHosts = (source.API_ALLOWED_HOSTS ?? `localhost:${port},127.0.0.1:${port},[::1]:${port}`)
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowedHosts.length || allowedHosts.some(value => /[\s/@?#]/.test(value) || value.includes("*"))) {
    throw new Error("API_ALLOWED_HOSTS must contain explicit hosts and ports");
  }
  return {
    databaseUrl: source.DATABASE_URL ?? "postgresql://miniflow:miniflow@localhost:5432/miniflow",
    corsOrigin: origin.origin, jwtSecret, allowedHosts,
    port, host: source.HOST ?? "127.0.0.1"
  };
}

/** 検証済みの起動設定。テストは実環境の秘密を参照せず明示的な値を注入する。 */
export type AppEnv = ReturnType<typeof getEnv>;
