/** CORSとHost/Originの境界を本番HTTPで検証する。ブラウザによるcookie挙動は別の実動確認で扱う。 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { httpFixture } from "../../../support/http";
let f: Awaited<ReturnType<typeof httpFixture>>;
beforeEach(async () => { f = await httpFixture(); });
afterEach(async () => { await f.server.close(); });

describe("HTTPのHost/Origin/CORS", () => {
  it("正規OriginのPATCH preflightを許可する", async () => {
    const response = await f.server.inject({ method: "OPTIONS", url: "http://localhost:3001/account", headers: { origin: f.env.corsOrigin, "access-control-request-method": "PATCH", "access-control-request-headers": "content-type,x-csrf-token" } });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(f.env.corsOrigin);
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
  it.each(["null", "http://localhost:9090", "https://evil.example", "http://localhost:3100.evil.example"])("別Origin %sはloginから拒否する", async origin => {
    const response = await f.server.inject({ method: "POST", url: "http://localhost:3001/auth/login", headers: { origin }, payload: { email: "applicant@example.test", password: "fixture-password-only" } });
    expect(response.statusCode).toBe(403);
    expect(response.cookies).toHaveLength(0);
  });
  it("未知Hostは認証の有無にかかわらず拒否する", async () => {
    expect((await f.server.inject({ url: "http://evil.example:3001/auth/me" })).statusCode).toBe(403);
  });
  it("Originなしでも状態変更にはCSRFが必要", async () => {
    const headers = await f.login();
    expect((await f.server.inject({ method: "PATCH", url: "http://localhost:3001/account", headers: { cookie: headers.cookie }, payload: { language: "ja" } })).statusCode).toBe(403);
  });
});
