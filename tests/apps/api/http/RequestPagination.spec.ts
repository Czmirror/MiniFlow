/** 本番HTTPの用途・ページ・集計・認証境界を、架空の45件以上で確認する。実DB queryは別の統合試験で確認する。 */
import { afterEach, describe, expect, it } from "vitest";
import { httpFixture, userIds } from "../../../support/http";
import { Request } from "../../../../apps/api/src/domain/request/Request";

let fixture: Awaited<ReturnType<typeof httpFixture>> | undefined;
afterEach(async () => { await fixture?.server.close(); });

async function setup() {
  const f = fixture = await httpFixture();
  for (let i = 1; i <= 46; i++) {
    let r = Request.createDraft({ id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
      teamId: i === 46 ? "team-2" : "team-1", createdBy: i <= 21 ? userIds.Admin : userIds.Applicant,
      title: `fixture ${i}`, body: "fixture", now: new Date("2026-01-01") });
    if (i <= 40) r = r.submit();
    if (i === 45) r = r.delete({});
    f.requests.records.set(r.id, r);
  }
  return f;
}

describe("申請の用途別ページと全件集計", () => {
  it("20件を超える一覧を安定順で全ページ取得し、削除済みと別teamを除く", async () => {
    const f = await setup(); const headers = await f.login("Admin");
    const results = [];
    for (let page = 1; page <= 3; page++) {
      const response = await f.server.inject({ url: `http://localhost:3001/requests?page=${page}`, headers });
      expect(response.statusCode).toBe(200); results.push(response.json());
    }
    expect(results.map(r => r.items.length)).toEqual([20, 20, 4]);
    expect(results.map(r => r.total)).toEqual([44, 44, 44]);
    const ids = results.flatMap(r => r.items.map((item: { id: string }) => item.id));
    expect(new Set(ids).size).toBe(44);
    expect(ids[0]).toBe("00000000-0000-0000-0000-000000000044");
    expect(ids[43]).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("本人と承認待ちをページ取得前に絞り、任意のteam/本人指定を採用しない", async () => {
    const f = await setup(); const admin = await f.login("Admin");
    const mine = await f.server.inject({ url: "http://localhost:3001/requests?scope=mine&createdBy=other&teamId=team-2", headers: admin });
    expect(mine.json().total).toBe(21);
    expect(mine.json().items.every((r: {createdBy: string}) => r.createdBy === userIds.Admin)).toBe(true);
    const pending = await f.server.inject({ url: "http://localhost:3001/requests?scope=pendingApprovals", headers: admin });
    expect(pending.json().total).toBe(19);
    const applicant = await f.login("Applicant");
    expect((await f.server.inject({ url: "http://localhost:3001/requests?scope=pendingApprovals", headers: applicant })).json().total).toBe(0);
    const outsider = await f.login("Outsider");
    expect((await f.server.inject({ url: "http://localhost:3001/requests", headers: outsider })).json().total).toBe(1);
  });

  it("全件集計がページサイズから独立する", async () => {
    const f = await setup(); const headers = await f.login("Admin");
    const response = await f.server.inject({ url: "http://localhost:3001/requests/summary", headers });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ total: 44, mine: 21, pending: 40, approved: 0, rejected: 0, drafts: 4 });
  });

  it.each(["scope=unknown", "scope=", "page=0", "page=1.5", "limit=101", "scope=pendingApprovals&status=Draft"])("不正入力を400にする: %s", async query => {
    const f = fixture = await httpFixture(); const headers = await f.login();
    expect((await f.server.inject({ url: `http://localhost:3001/requests?${query}`, headers })).statusCode).toBe(400);
  });

  it("集計はqueryを受け付けない", async () => {
    const f = fixture = await httpFixture(); const headers = await f.login();
    expect((await f.server.inject({ url: "http://localhost:3001/requests/summary?teamId=team-2", headers })).statusCode).toBe(400);
  });

  it("一覧と集計には認証が必要", async () => {
    const f = fixture = await httpFixture();
    for (const url of ["/requests", "/requests/summary"]) expect((await f.server.inject({ url: `http://localhost:3001${url}` })).statusCode).toBe(401);
  });
});
