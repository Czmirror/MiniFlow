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
