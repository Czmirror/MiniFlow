/** domainの競合例外を移動しても、認証と申請のHTTP 409契約を維持することを本番HTTPで確認する。DBは使わない。 */
import { describe, expect, it } from "vitest";
import { httpFixture, testPassword } from "../../../support/http";

describe("競合例外のHTTP変換", () => {
  it("既存emailのユーザー作成は従来の409本文で未保存", async () => {
    const f = await httpFixture();
    try {
      const headers = await f.login("Admin");
      const result = await f.server.inject({ method: "POST", url: "http://localhost:3001/users", headers, payload: { email: "applicant@example.test", password: testPassword } });
      expect(result.statusCode).toBe(409);
      expect(result.json()).toEqual({ error: { code: "STATE_CONFLICT", message: "email already exists", status: 409 } });
      expect(f.users.writes).toBe(0);
    } finally { await f.server.close(); }
  });
  it("提出済み申請の再提出は従来の409本文で状態を維持", async () => {
    const f = await httpFixture();
    try {
      const headers = await f.login();
      const created = await f.server.inject({ method: "POST", url: "http://localhost:3001/requests", headers, payload: { title: "架空申請", body: "fixture" } });
      expect(created.statusCode).toBe(201);
      const id = created.json().id;
      const submit = () => f.server.inject({ method: "POST", url: `http://localhost:3001/requests/${id}/submit`, headers });
      expect((await submit()).statusCode).toBe(200);
      const writes = f.requests.writes.length;
      const repeated = await submit();
      expect(repeated.statusCode).toBe(409);
      expect(repeated.json()).toEqual({ error: { code: "STATE_CONFLICT", message: "submit is only allowed in Draft", status: 409 } });
      expect(f.requests.writes).toHaveLength(writes);
      expect((await f.requests.findById(id))?.status).toBe("Pending");
    } finally { await f.server.close(); }
  });
});
