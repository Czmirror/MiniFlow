/** 認証期限・全失効・部分更新・runtime型検査を本番HTTPで確認する。DBは架空のメモリ保存先。 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpFixture, testPassword, userIds } from "../../../support/http";
import { SESSION_TTL_SECONDS } from "../../../../apps/api/src/infrastructure/auth/jwt";
let f: Awaited<ReturnType<typeof httpFixture>>;
beforeEach(async () => { f = await httpFixture(); });
afterEach(async () => { vi.restoreAllMocks(); await f.server.close(); });
const url = (path: string) => `http://localhost:3001${path}`;

describe("認証・入力のHTTP契約", () => {
  it("loginのJWTとcookieは8時間、内部世代はDTOに出さない", async () => {
    const response = await f.server.inject({ method: "POST", url: url("/auth/login"), payload: { email: "applicant@example.test", password: testPassword } });
    expect(response.statusCode).toBe(200);
    const token = response.cookies.find(c => c.name === "miniflow_auth")!;
    const payload = f.server.jwt.decode<{ iat: number; exp: number; sv: number }>(token.value)!;
    expect(payload.exp - payload.iat).toBe(SESSION_TTL_SECONDS);
    expect(payload.sv).toBe(0);
    expect(response.headers["set-cookie"]?.toString()).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(response.json().user).not.toHaveProperty("sessionVersion");
  });

  it("期限切れ・世代なし・不一致・署名不正のtokenは401", async () => {
    const sid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const encoded = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: userIds.Applicant, sv: 0, sid })).toString("base64url")].join(".");
    const expiryless = `${encoded}.${createHmac("sha256", f.env.jwtSecret).update(encoded).digest("base64url")}`;
    const tokens = [
      expiryless,
      f.server.jwt.sign({ sub: userIds.Applicant, sv: 0, sid }, { expiresIn: -1 }),
      f.server.jwt.sign({ sub: userIds.Applicant, sid }),
      f.server.jwt.sign({ sub: userIds.Applicant, sv: 0 }),
      f.server.jwt.sign({ sub: userIds.Applicant, sv: 99, sid }),
      "invalid-token"
    ];
    for (const token of tokens) expect((await f.server.inject({ url: url("/auth/me"), headers: { cookie: `miniflow_auth=${token}` } })).statusCode).toBe(401);
  });

  it("password変更は全tokenを失効させ、cookieを削除する", async () => {
    const [first, second] = await Promise.all([f.login(), f.login()]);
    const result = await f.server.inject({ method: "POST", url: url("/account/password"), headers: first, payload: { currentPassword: testPassword, newPassword: "new-fixture-password" } });
    expect(result.statusCode).toBe(200);
    expect(result.cookies.find(c => c.name === "miniflow_auth")?.value).toBe("");
    for (const headers of [first, second]) expect((await f.server.inject({ url: url("/auth/me"), headers })).statusCode).toBe(401);
    expect((await f.users.findById(userIds.Applicant))?.sessionVersion).toBe(1);
    const [oldLogin, newLogin] = await Promise.all([
      f.server.inject({ method: "POST", url: url("/auth/login"), payload: { email: "applicant@example.test", password: testPassword } }),
      f.server.inject({ method: "POST", url: url("/auth/login"), payload: { email: "applicant@example.test", password: "new-fixture-password" } })
    ]);
    expect(oldLogin.statusCode).toBe(400);
    expect(newLogin.statusCode).toBe(200);
  });

  it("現在password不一致では未保存、既存tokenは維持する", async () => {
    const headers = await f.login();
    expect((await f.server.inject({ method: "POST", url: url("/account/password"), headers, payload: { currentPassword: "wrong-fixture-password", newPassword: "new-fixture-password" } })).statusCode).toBe(400);
    expect(f.users.writes).toBe(0);
    expect((await f.server.inject({ url: url("/auth/me"), headers })).statusCode).toBe(200);
  });

  it("部分更新は未指定を維持し、nullは表示名だけを削除する", async () => {
    const headers = await f.login();
    const update = (payload: object) => f.server.inject({ method: "PATCH", url: url("/account"), headers, payload });
    expect((await update({ displayName: "New" })).json()).toMatchObject({ displayName: "New", language: "en" });
    expect((await update({ language: "ja" })).json()).toMatchObject({ displayName: "New", language: "ja" });
    expect((await update({ displayName: null })).json()).toMatchObject({ displayName: null, language: "ja" });
    expect((await update({ role: "Admin", teamId: "team-2" })).json()).toMatchObject({ role: "Applicant", teamId: "team-1" });
  });

  it.each([{ language: null }, { language: "fr" }, { displayName: 9 }, []])("型・言語不正は400で未保存: %j", async payload => {
    const headers = await f.login();
    const response = await f.server.inject({ method: "PATCH", url: url("/account"), headers, payload });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "INVALID_INPUT", status: 400 } });
    expect(f.users.writes).toBe(0);
  });

  it.each([{ role: "Root" }, { role: null }, { isActive: "false" }, { language: "fr" }, { teamId: 99 }, { displayName: [] }])("管理者入力の型違いも400で拒否: %j", async payload => {
    const headers = await f.login("Admin");
    expect((await f.server.inject({ method: "PATCH", url: url(`/users/${userIds.Applicant}`), headers, payload })).statusCode).toBe(400);
    expect(f.users.writes).toBe(0);
  });

  it("不正UUID・不正status・不正includeDeletedは保存先へ渡さない", async () => {
    const headers = await f.login();
    const find = vi.spyOn(f.requests, "findById");
    const list = vi.spyOn(f.requests, "list");
    for (const path of ["/requests/not-a-uuid", "/requests?status=Other", "/requests?includeDeleted=maybe", "/requests?limit=101", "/requests?page=", "/requests?limit=", "/requests?page=9007199254740992", "/requests?page=9007199254740991&limit=20"]) {
      expect((await f.server.inject({ url: url(path), headers })).statusCode).toBe(400);
    }
    expect(find).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });

  it.each([{ title: " ", body: "body" }, { title: "title", body: null }, { title: 9, body: "body" }])("申請の型違い・空白は400で未保存: %j", async payload => {
    const headers = await f.login();
    expect((await f.server.inject({ method: "POST", url: url("/requests"), headers, payload })).statusCode).toBe(400);
    expect(f.requests.writes).toHaveLength(0);
  });

  it("認証保存先の障害を401と混同せず、内部値をレスポンスへ出さない", async () => {
    const headers = await f.login();
    vi.spyOn(f.users, "findById").mockRejectedValue(new Error("fixture private database failure"));
    const response = await f.server.inject({ url: url("/auth/me"), headers });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("private database");
  });
});
