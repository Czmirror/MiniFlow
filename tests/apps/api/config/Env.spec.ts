/** 起動設定のfail-closedと、機密設定値をエラーへ含めないことを確認する。実環境変数は読まない。 */
import { describe, expect, it } from "vitest";
import { getEnv } from "../../../../apps/api/src/infrastructure/config/env";

describe("起動設定", () => {
  it.each([undefined, "", "   "])("JWT鍵が未指定・空なら拒否する", JWT_SECRET => {
    expect(() => getEnv({ JWT_SECRET })).toThrow("JWT_SECRET is required");
  });
  it("既定bindはloopbackで、許可HostのportをAPI portに合わせる", () => {
    expect(getEnv({ JWT_SECRET: "test-only", PORT: "4001" })).toMatchObject({ port: 4001, host: "127.0.0.1", allowedHosts: ["localhost:4001", "127.0.0.1:4001", "[::1]:4001"] });
  });
  it.each(["0", "65536", "NaN", "1.5"])("不正port %sを拒否", PORT => {
    expect(() => getEnv({ JWT_SECRET: "test-only", PORT })).toThrow("PORT");
  });
  it.each(["null", "http://user:fixture-only@localhost:3100", "http://localhost:3100/path", "http://localhost:3100?key=fixture-only"])("Originに認証情報・path等を許可しない", CORS_ORIGIN => {
    expect(() => getEnv({ JWT_SECRET: "test-only", CORS_ORIGIN })).toThrow("CORS_ORIGIN must be an HTTP origin");
  });
  it("明示したDocker bindと許可Hostは利用できる", () => {
    expect(getEnv({ JWT_SECRET: "test-only", HOST: "0.0.0.0", API_ALLOWED_HOSTS: "api.example.test:3001" })).toMatchObject({ host: "0.0.0.0", allowedHosts: ["api.example.test:3001"] });
  });
  it("Hostのwildcardは拒否する", () => {
    expect(() => getEnv({ JWT_SECRET: "test-only", API_ALLOWED_HOSTS: "*" })).toThrow("API_ALLOWED_HOSTS");
  });
});

// 接続しない架空の設定。実環境の秘密・DBは参照しない。
const productionSource = {
  NODE_ENV: "production", JWT_SECRET: "production-fixture-key-not-a-secret",
  CORS_ORIGIN: "https://app.example.test", API_ALLOWED_HOSTS: "api.example.test",
  DATABASE_URL: "postgresql://fixture@db.example.test/preview"
};

describe("公開プレビューの設定", () => {
  it("ローカルHTTPの既定値を維持する", () => {
    expect(getEnv({ JWT_SECRET: "fixture-only" })).toMatchObject({
      secureCookies: false, corsOrigin: "http://localhost:3100", host: "127.0.0.1"
    });
  });
  it.each(["", "prod", "Production", " production "])("未知の環境名を拒否する: %j", NODE_ENV => {
    expect(() => getEnv({ ...productionSource, NODE_ENV })).toThrow("NODE_ENV");
  });
  it.each([undefined, "", "http://app.example.test"])("本番では明示的なHTTPS Originが必要: %j", CORS_ORIGIN => {
    expect(() => getEnv({ ...productionSource, CORS_ORIGIN })).toThrow("CORS_ORIGIN");
  });
  it.each([undefined, "", "   "])("本番ではHostとDBの明示指定が必要: %j", value => {
    expect(() => getEnv({ ...productionSource, API_ALLOWED_HOSTS: value })).toThrow("API_ALLOWED_HOSTS");
    expect(() => getEnv({ ...productionSource, DATABASE_URL: value })).toThrow("DATABASE_URL");
  });
  it.each(["https://db.example.test/preview", "postgresql://db.example.test", "postgresql:///preview", "invalid-fixture-url"])("本番ではPostgreSQL接続URLだけを受け付ける: %s", DATABASE_URL => {
    expect(() => getEnv({ ...productionSource, DATABASE_URL })).toThrow("DATABASE_URL");
  });
  it("本番の鍵はUTF-8で32バイト以上が必要", () => {
    expect(() => getEnv({ ...productionSource, JWT_SECRET: "x".repeat(31) })).toThrow("JWT_SECRET");
    expect(getEnv({ ...productionSource, JWT_SECRET: "x".repeat(32) }).secureCookies).toBe(true);
    expect(getEnv({ ...productionSource, JWT_SECRET: "あ".repeat(11) }).secureCookies).toBe(true);
  });
  it.each([
    { NODE_ENV: "development", CORS_ORIGIN: "https://app.example.test" },
    { NODE_ENV: "test", CORS_ORIGIN: "https://app.example.test" },
    { NODE_ENV: "production", CORS_ORIGIN: "https://app.example.test" }
  ])("HTTPSまたは本番ではSecure Cookieを指定する: %j", override => {
    expect(getEnv({ ...productionSource, ...override }).secureCookies).toBe(true);
  });
  it("設定エラーに秘密の実値を出さない", () => {
    const JWT_SECRET = "private-fixture-key";
    expect(() => getEnv({ ...productionSource, JWT_SECRET })).toThrow(/^JWT_SECRET must contain at least 32 UTF-8 bytes in production$/);
    expect(() => getEnv({ ...productionSource, DATABASE_URL: "https://fixture:private-fixture-password@db.example.test/preview" }))
      .toThrow(/^DATABASE_URL must be explicitly set to a PostgreSQL URL in production$/);
  });
});
