/** 本番設定からCookieとHost/Origin/CSRFへ接続するHTTP契約を確認する。TLSとブラウザは起動しない。 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv } from "../../../../apps/api/src/infrastructure/config/env";
import { httpFixture, testPassword } from "../../../support/http";
import { SESSION_TTL_SECONDS } from "../../../../apps/api/src/infrastructure/auth/jwt";

let f: Awaited<ReturnType<typeof httpFixture>>;
const origin = "https://app.example.test";
const host = "api.example.test";
const url = (path: string) => `https://${host}${path}`;
beforeEach(async () => {
  f = await httpFixture(getEnv({ NODE_ENV: "production", JWT_SECRET: "production-fixture-key-not-a-secret",
    CORS_ORIGIN: origin, API_ALLOWED_HOSTS: host, DATABASE_URL: "postgresql://fixture@db.example.test/preview" }));
});
afterEach(async () => { await f.server.close(); });

async function login() {
  return f.server.inject({ method: "POST", url: url("/auth/login"), headers: { host, origin },
    payload: { email: "applicant@example.test", password: testPassword } });
}
async function session() {
  const response = await login();
  expect(response.statusCode).toBe(200);
  return { host, origin, cookie: response.cookies.map(c => `${c.name}=${c.value}`).join("; "),
    "x-csrf-token": response.cookies.find(c => c.name === "miniflow_csrf")!.value };
}
function expectSecureCookies(response: Awaited<ReturnType<typeof login>>, cleared = false) {
  expect(response.cookies).toHaveLength(2);
  for (const cookie of response.cookies) {
    expect(cookie.secure).toBe(true);
    expect(cookie.path).toBe("/");
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.domain).toBeUndefined();
    expect(Boolean(cookie.httpOnly)).toBe(cookie.name === "miniflow_auth");
    if (cleared) expect(cookie.value).toBe("");
    else expect(cookie.maxAge).toBe(SESSION_TTL_SECONDS);
  }
}

describe("公開プレビューのHTTP境界", () => {
  it("ログインにSecure Cookieを発行する", async () => {
    const response = await login();
    expect(response.statusCode).toBe(200);
    expectSecureCookies(response);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
  it("正規Originのpreflight・CSRF取得・更新が通る", async () => {
    const headers = await session();
    const preflight = await f.server.inject({ method: "OPTIONS", url: url("/account"), headers: {
      host, origin, "access-control-request-method": "PATCH", "access-control-request-headers": "content-type,x-csrf-token" } });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe(origin);
    expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
    const csrf = await f.server.inject({ url: url("/auth/csrf"), headers });
    expect(csrf.statusCode).toBe(200);
    expect(csrf.json().csrfToken).toBe(headers["x-csrf-token"]);
    expect((await f.server.inject({ method: "PATCH", url: url("/account"), headers, payload: { language: "ja" } })).statusCode).toBe(200);
  });
  it.each(["null", "http://app.example.test", "https://evil.example.test"])("別OriginではCookieを発行しない: %s", untrusted => {
    return f.server.inject({ method: "POST", url: url("/auth/login"), headers: { host, origin: untrusted },
      payload: { email: "applicant@example.test", password: testPassword } }).then(response => {
      expect(response.statusCode).toBe(403);
      expect(response.cookies).toHaveLength(0);
    });
  });
  it("転送ヘッダーだけを偽装しても未知Hostを許可しない", async () => {
    const response = await f.server.inject({ url: "https://evil.example.test/auth/me", headers: { "x-forwarded-host": host, "x-forwarded-proto": "https" } });
    expect(response.statusCode).toBe(403);
  });
  it("CSRFなし・別Originの更新は保存しない", async () => {
    const headers = await session();
    for (const rejected of [{ host, cookie: headers.cookie, origin }, { ...headers, origin: "https://evil.example.test" }]) {
      expect((await f.server.inject({ method: "PATCH", url: url("/account"), headers: rejected, payload: { language: "ja" } })).statusCode).toBe(403);
    }
    expect(f.users.writes).toBe(0);
  });
  it.each(["/auth/logout", "/account/password"])("Cookie削除でもSecure属性を維持する: %s", async path => {
    const headers = await session();
    const response = await f.server.inject({ method: "POST", url: url(path), headers,
      ...(path === "/account/password" ? { payload: { currentPassword: testPassword, newPassword: "new-fixture-password" } } : {}) });
    expect(response.statusCode).toBe(path === "/auth/logout" ? 204 : 200);
    expectSecureCookies(response, true);
  });
});
