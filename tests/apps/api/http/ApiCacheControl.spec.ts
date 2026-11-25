/** 本番HTTPの成功・拒否・障害応答が保存禁止になることを確認する。保存先だけをfixtureへ置換し、実DBへ接続しない。 */
import { describe, expect, it } from "vitest";
import { httpFixture, testPassword } from "../../../support/http";

describe("API応答の保存禁止", () => {
  it("認証・本人・申請・管理・空応答とHEAD/OPTIONSを保存させない", async () => {
    const f = await httpFixture();
    try {
      const login = await f.server.inject({ method: "POST", url: "http://localhost:3001/auth/login", headers: { origin: f.env.corsOrigin }, payload: { email: "admin@example.test", password: testPassword } });
      expect(login.statusCode).toBe(200);
      expect(login.headers["cache-control"]).toBe("no-store");
      const headers = { ...await f.login("Admin"), host: "localhost:3001" };
      for (const url of ["/auth/me", "/auth/csrf", "/requests", "/requests/summary", "/users"]) {
        const response = await f.server.inject({ method: "GET", url, headers });
        expect(response.statusCode, url).toBe(200);
        expect(response.headers["cache-control"], url).toBe("no-store");
      }
      const head = await f.server.inject({ method: "HEAD", url: "/auth/me", headers });
      const preflight = await f.server.inject({ method: "OPTIONS", url: "/account", headers: { host: "localhost:3001", origin: f.env.corsOrigin, "access-control-request-method": "PATCH" } });
      const logout = await f.server.inject({ method: "POST", url: "/auth/logout", headers });
      expect(head.statusCode).toBe(200);
      expect(preflight.statusCode).toBe(204);
      expect(logout.statusCode).toBe(204);
      for (const response of [head, preflight, logout]) {
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.body).toBe("");
      }
    } finally { await f.server.close(); }
  });
  it("認証・権限・Host・Origin・CSRF・入力・未存在の拒否も保存させない", async () => {
    const f = await httpFixture();
    try {
      const headers = { ...await f.login(), host: "localhost:3001" };
      const cases = [
        [await f.server.inject({ method: "GET", url: "/auth/me", headers: { host: "localhost:3001" } }), 401],
        [await f.server.inject({ method: "GET", url: "/users", headers }), 403],
        [await f.server.inject({ method: "GET", url: "/auth/me", headers: { ...headers, host: "untrusted.example.test" } }), 403],
        [await f.server.inject({ method: "PATCH", url: "/account", headers: { ...headers, origin: "https://untrusted.example.test" }, payload: { displayName: "blocked" } }), 403],
        [await f.server.inject({ method: "PATCH", url: "/account", headers: { ...headers, "x-csrf-token": "invalid-fixture" }, payload: { displayName: "blocked" } }), 403],
        [await f.server.inject({ method: "PATCH", url: "/account", headers, payload: { language: "invalid" } }), 400],
        [await f.server.inject({ method: "GET", url: "/not-found", headers }), 404]
      ] as const;
      for (const [response, status] of cases) {
        expect(response.statusCode).toBe(status);
        expect(response.headers["cache-control"]).toBe("no-store");
      }
      expect(f.users.writes).toBe(0);
    } finally { await f.server.close(); }
  });
  it("保存先の障害による500も保存させず、内部情報を公開しない", async () => {
    const f = await httpFixture();
    try {
      const headers = { ...await f.login(), host: "localhost:3001" };
      f.requests.findById = async () => { throw new Error("fixture-storage-failure"); };
      const response = await f.server.inject({ method: "GET", url: "/requests/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", headers });
      expect(response.statusCode).toBe(500);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).not.toContain("fixture-storage-failure");
    } finally { await f.server.close(); }
  });
});
