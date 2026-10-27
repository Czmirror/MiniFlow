/** 本番HTTPの応答完了イベントを捕捉し、commit後だけの成功、拒否/障害、秘密・自由文の不出力を確認する。 */
import { describe, expect, it } from "vitest";
import { StateConflictError } from "../../../../apps/api/src/domain/errors/StateConflictError";
import { httpFixture, testPassword, userIds } from "../../../support/http";
import { Request } from "../../../../apps/api/src/domain/request/Request";

it("業務イベントは安全なfieldだけで保存結果を記録する", async () => {
  const logs: string[] = [];
  const f = await httpFixture(undefined, { stream: { write(line: string) { logs.push(line); } } });
  const server = f.server;
  try {
    const login = await server.inject({method:"POST",url:"http://localhost:3001/auth/login",payload:{email:"applicant@example.test",password:testPassword}});
    const cookie=login.cookies.map(c=>`${c.name}=${c.value}`).join("; ");
    const token=login.cookies.find(c=>c.name==="miniflow_csrf")!.value;
    const headers={host:"localhost:3001",cookie,"x-csrf-token":token};
    const r=Request.createDraft({id:"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",teamId:"team-1",createdBy:userIds.Applicant,title:"fixture",body:"fixture"});
    f.requests.records.set(r.id,r);
    const response=await server.inject({method:"PATCH",url:`/requests/${r.id}`,headers,payload:{title:"private-title-marker",body:"private-body-marker"}});
    expect(response.statusCode).toBe(200); expect(response.json()).not.toHaveProperty("version");
    f.requests.update=async()=>{throw new StateConflictError("reload");};
    expect((await server.inject({method:"PATCH",url:`/requests/${r.id}`,headers,payload:{title:"private-title-marker"}})).statusCode).toBe(409);
    f.requests.update=async()=>{throw new Error("private-exception-marker");};
    expect((await server.inject({method:"PATCH",url:`/requests/${r.id}`,headers,payload:{title:"private-title-marker"}})).statusCode).toBe(500);
    const all=logs.join("");
    for (const secret of [testPassword,cookie,token,"applicant@example.test","private-title-marker","private-body-marker","private-exception-marker"]) expect(all).not.toContain(secret);
    expect(logs.map(l=>JSON.parse(l)).filter(l=>l.level===50)).toHaveLength(1);
    const events=logs.map(l=>JSON.parse(l)).filter(l=>l.event==="operation_result"&&l.action==="request.update");
    expect(events.map(e=>e.result)).toEqual(["success","rejected","failure"]);
    expect(events[0]).toMatchObject({actorId:userIds.Applicant,resourceId:r.id,status:200});
    for (const e of events) expect(Object.keys(e).sort()).toEqual(["action","actorId","event","hostname","level","msg","pid","reqId","requestId","resourceId","result","status","time"].sort());
  } finally {await server.close();}
});
