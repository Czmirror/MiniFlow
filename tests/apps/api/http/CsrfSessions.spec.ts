/** 本番HTTPでsessionとCSRFの結び付け、反復取得の安定、cookie不変、改ざん/旧方式/他session拒否を確認する。 */
import { describe, expect, it } from "vitest";
import { createCsrfToken, verifyCsrfToken } from "../../../../apps/api/src/infrastructure/auth/csrf";
import { httpFixture } from "../../../support/http";

describe("session-bound CSRF", () => {
  it("HMACは同sessionで安定し、未知形式・改ざん・別sessionを拒否する", () => {
    const token = createCsrfToken("fixture-key", "session-a");
    expect(createCsrfToken("fixture-key", "session-a")).toBe(token);
    expect(verifyCsrfToken("fixture-key", "session-a", token)).toBe(true);
    for (const bad of [undefined, null, [], "", "old-random-token", "f".repeat(64), token + "00"]) {
      expect(verifyCsrfToken("fixture-key", "session-a", bad)).toBe(false);
    }
    expect(verifyCsrfToken("fixture-key", "session-b", token)).toBe(false);
    expect(verifyCsrfToken("wrong-key", "session-a", token)).toBe(false);
  });
  it("並行・反復取得で同tokenを返し、cookieを書き換えない", async () => {
    const f = await httpFixture();
    try {
      const headers = await f.login();
      const responses = await Promise.all([1,2,3].map(() => f.server.inject({ method: "GET", url: "/auth/csrf", headers: { ...headers, host: "localhost:3001" } })));
      for (const response of responses) {
        expect(response.statusCode).toBe(200);
        expect(response.json().csrfToken).toBe(headers["x-csrf-token"]);
        expect(response.headers["set-cookie"]).toBeUndefined();
        expect(response.headers["cache-control"]).toBe("no-store");
      }
      expect(f.server.jwt.decode(headers.cookie.split("; ")[0].split("=")[1])).toHaveProperty("sid");
    } finally { await f.server.close(); }
  });
  it("cookieとheaderだけが一致しても署名不正・別sessionなら拒否し、現在sessionは通る", async () => {
    const f = await httpFixture();
    try {
      const first = await f.login(), second = await f.login();
      for (const token of [first["x-csrf-token"], "old-random-token", "0".repeat(64)]) {
        const headers = { ...second, host: "localhost:3001", "x-csrf-token": token,
          cookie: second.cookie.replace(/miniflow_csrf=[^;]+/, `miniflow_csrf=${token}`) };
        expect((await f.server.inject({ method: "PATCH", url: "/account", headers, payload: { displayName: "blocked" } })).statusCode).toBe(403);
      }
      expect(f.users.writes).toBe(0);
      expect((await f.server.inject({ method: "PATCH", url: "/account", headers: { ...second, host: "localhost:3001" }, payload: { displayName: "allowed" } })).statusCode).toBe(200);
    } finally { await f.server.close(); }
  });
});
