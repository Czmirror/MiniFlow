/**
 * 注入された環境変数を起動前に検証する。本番はHTTPS・明示Host/DB・32バイト以上の鍵を必須にする。
 * 設定不正は値を含まない例外で拒否する。外部I/Oは行わず、CookieのSecure指定もこの時点で確定する。
 */
export function getEnv(source: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = source.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const production = nodeEnv === "production";
  const jwtSecret = source.JWT_SECRET;
  if (!jwtSecret?.trim()) throw new Error("JWT_SECRET is required");
  // HS256の最低鍵長。長さの検査だけでは乱数の強度までは保証しない。
  if (production && Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("JWT_SECRET must contain at least 32 UTF-8 bytes in production");
  }
  const port = Number(source.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port");
  let origin: URL;
  try { origin = new URL(source.CORS_ORIGIN ?? "http://localhost:3100"); }
  catch { throw new Error("CORS_ORIGIN must be an HTTP origin"); }
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("CORS_ORIGIN must be an HTTP origin");
  }
  if (production && (!source.CORS_ORIGIN?.trim() || origin.protocol !== "https:")) {
    throw new Error("CORS_ORIGIN must be explicitly set to an HTTPS origin in production");
  }
  if (production && !source.API_ALLOWED_HOSTS?.trim()) {
    throw new Error("API_ALLOWED_HOSTS is required in production");
  }
  const databaseUrl = source.DATABASE_URL ?? "postgresql://miniflow:miniflow@localhost:5432/miniflow";
  if (production) {
    let database: URL;
    try { database = new URL(source.DATABASE_URL ?? ""); }
    catch { throw new Error("DATABASE_URL must be explicitly set to a PostgreSQL URL in production"); }
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || database.pathname.length < 2) {
      throw new Error("DATABASE_URL must be explicitly set to a PostgreSQL URL in production");
    }
  }
  const allowedHosts = (source.API_ALLOWED_HOSTS ?? `localhost:${port},127.0.0.1:${port},[::1]:${port}`)
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!allowedHosts.length || allowedHosts.some(value => /[\s/@?#]/.test(value) || value.includes("*"))) {
    throw new Error("API_ALLOWED_HOSTS must contain explicit hosts and ports");
  }
  return {
    databaseUrl, secureCookies: production || origin.protocol === "https:",
    corsOrigin: origin.origin, jwtSecret, allowedHosts,
    port, host: source.HOST ?? "127.0.0.1"
  };
}

/** 検証済みの起動設定。テストは実環境の秘密を参照せず明示的な値を注入する。 */
export type AppEnv = ReturnType<typeof getEnv>;
