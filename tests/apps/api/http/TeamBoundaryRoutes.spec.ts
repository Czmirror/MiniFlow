/** 本番HTTPの認証・role・team・所有の境界を実リクエストで検証する。保存先のみfake。 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Request } from "../../../../apps/api/src/domain/request/Request";
import { httpFixture, requestId, userIds } from "../../../support/http";

let fixture: Awaited<ReturnType<typeof httpFixture>>;
beforeEach(async () => { fixture = await httpFixture(); });
afterEach(async () => { await fixture.server.close(); });
const url = (path: string) => `http://localhost:3001${path}`;

function seed(status: "Draft" | "Pending" | "Rejected" = "Draft", teamId = "team-1") {
  let request = Request.createDraft({ id: requestId, teamId, createdBy: userIds.Applicant, title: "title", body: "body" });
  if (status !== "Draft") request = request.submit();
  if (status === "Rejected") request = request.reject({ actorId: userIds.Approver, approvalId: "seed-rejection" }).request;
  fixture.requests.records.set(request.id, request);
}

describe("HTTPのteamと管理者境界", () => {
  it("公開registerは404で、ユーザーを作成しない", async () => {
    const response = await fixture.server.inject({ method: "POST", url: url("/auth/register"), payload: { email: "new@example.test", password: "fixture-password-only" } });
    expect(response.statusCode).toBe(404);
    expect(fixture.users.writes).toBe(0);
  });

  it("ユーザー管理は未認証を401で拒否する", async () => {
    expect((await fixture.server.inject({ url: url("/users") })).statusCode).toBe(401);
  });

  it.each(["Applicant", "Approver"] as const)("%sはユーザー作成・割当・一覧を操作できない", async role => {
    const headers = await fixture.login(role);
    for (const request of [
      { method: "GET" as const, url: url("/users") },
      { method: "POST" as const, url: url("/users"), payload: { email: "new@example.test", password: "fixture-password-only", role: "Admin", teamId: "team-2" } },
      { method: "PATCH" as const, url: url(`/users/${userIds.Applicant}`), payload: { teamId: "team-2", role: "Admin" } }
    ]) expect((await fixture.server.inject({ ...request, headers })).statusCode).toBe(403);
    expect(fixture.users.writes).toBe(0);
  });

  it("Adminはユーザーを作成し、チームを割り当てられる", async () => {
    const headers = await fixture.login("Admin");
    const created = await fixture.server.inject({ method: "POST", url: url("/users"), headers, payload: { email: "new@example.test", password: "fixture-password-only", teamId: "team-2", role: "Approver" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ teamId: "team-2", role: "Approver" });
    expect(created.json()).not.toHaveProperty("passwordHash");
    expect(created.json()).not.toHaveProperty("sessionVersion");
    const updated = await fixture.server.inject({ method: "PATCH", url: url(`/users/${created.json().id}`), headers, payload: { teamId: "team-3", isActive: false } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ teamId: "team-3", role: "Approver", isActive: false });
  });

  it("作成・一覧のteam/actorは認証から解決しクライアントの値を無視する", async () => {
    const headers = await fixture.login();
    const created = await fixture.server.inject({ method: "POST", url: url("/requests"), headers, payload: { teamId: "team-2", actorId: userIds.Admin, role: "Admin", title: "title", body: "body" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ teamId: "team-1", createdBy: userIds.Applicant });
    const list = vi.spyOn(fixture.requests, "list");
    expect((await fixture.server.inject({ url: url("/requests?teamId=team-2"), headers })).statusCode).toBe(200);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ teamId: "team-1" }));
  });

  it.each(["Applicant", "Approver", "Admin"] as const)("%sも別チームの詳細・更新・全遷移を拒否される", async role => {
    seed("Draft", "team-2");
    const headers = await fixture.login(role);
    const responses = [
      await fixture.server.inject({ url: url(`/requests/${requestId}`), headers }),
      await fixture.server.inject({ method: "PATCH", url: url(`/requests/${requestId}`), headers, payload: { title: "changed" } })
    ];
    for (const action of ["submit", "approve", "reject", "revise", "delete"]) responses.push(await fixture.server.inject({ method: "POST", url: url(`/requests/${requestId}/${action}`), headers }));
    expect(responses.map(r => r.statusCode)).toEqual(Array(7).fill(403));
    expect(fixture.requests.writes).toHaveLength(0);
  });

  it("同じチームでも他人の編集・提出・修正・削除を拒否する", async () => {
    const headers = await fixture.login("Approver");
    seed();
    expect((await fixture.server.inject({ method: "PATCH", url: url(`/requests/${requestId}`), headers, payload: { title: "changed" } })).statusCode).toBe(403);
    for (const action of ["submit", "delete"]) expect((await fixture.server.inject({ method: "POST", url: url(`/requests/${requestId}/${action}`), headers })).statusCode).toBe(403);
    seed("Rejected");
    expect((await fixture.server.inject({ method: "POST", url: url(`/requests/${requestId}/revise`), headers })).statusCode).toBe(403);
    expect(fixture.requests.writes).toHaveLength(0);
  });

  it("Applicantの決定と自己決定を拒否し、Approverの承認は通す", async () => {
    seed("Pending");
    const own = await fixture.login();
    for (const action of ["approve", "reject"]) expect((await fixture.server.inject({ method: "POST", url: url(`/requests/${requestId}/${action}`), headers: own })).statusCode).toBe(403);
    const approver = await fixture.login("Approver");
    expect((await fixture.server.inject({ method: "POST", url: url(`/requests/${requestId}/approve`), headers: approver })).statusCode).toBe(200);
    expect(fixture.requests.writes).toHaveLength(1);
  });
});
