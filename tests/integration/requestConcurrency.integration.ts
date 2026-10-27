/** 明示起動専用。承認された使い捨てPostgreSQLで本番usecase/repositoryの競合とrollbackを検証する。既存DBへは接続しない。 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../../apps/api/node_modules/@prisma/client";
import { Request } from "../../apps/api/src/domain/request/Request";
import { PrismaRequestRepository } from "../../apps/api/src/infrastructure/repositories/PrismaRequestRepository";
import type { RequestRepository } from "../../apps/api/src/application/ports/RequestRepository";
import { approveRequest } from "../../apps/api/src/application/requests/ApproveRequest";
import { rejectRequest } from "../../apps/api/src/application/requests/RejectRequest";
import { updateRequest } from "../../apps/api/src/application/requests/UpdateRequest";
import { submitRequest } from "../../apps/api/src/application/requests/SubmitRequest";
import { StateConflictError } from "../../apps/api/src/application/errors/StateConflictError";

const creator = "11111111-1111-1111-1111-111111111111", actor = "22222222-2222-2222-2222-222222222222";

/** 2要求の読取完了を揃えるだけのI/O調整。保存・遷移の実装は複製しない。 */
function concurrentReads(repo: RequestRepository): RequestRepository {
  let reads = 0;
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  return {
    summary: (team, actor) => repo.summary(team, actor),
    create: r => repo.create(r), update: r => repo.update(r), approve: (r,a) => repo.approve(r,a), reject: (r,a) => repo.reject(r,a), list: i => repo.list(i),
    async findById(id) { const r = await repo.findById(id); if (++reads === 2) release(); await ready; return r; }
  };
}
async function main() {
  const raw = process.env.STAGE3_TEST_DATABASE_URL;
  if (!raw) throw new Error("explicit isolated test database URL is required");
  const url = new URL(raw);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/miniflow_stage3_test" || url.username !== "miniflow_test") throw new Error("isolated test database guard rejected target");
  const prisma = new PrismaClient({ datasourceUrl: raw, log: [] });
  const repo = new PrismaRequestRepository(prisma);
  let passed = 0;
  async function seed(pending = false) {
    let r = await repo.create(Request.createDraft({ id: randomUUID(), teamId: "fixture-team", createdBy: creator, title: "fixture", body: "fixture" }));
    if (pending) r = await repo.update(r.submit());
    return r;
  }
  async function race(a: Promise<unknown>, b: Promise<unknown>) {
    const results = await Promise.allSettled([a,b]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const failure = results.find(r => r.status === "rejected");
    assert(failure?.status === "rejected" && failure.reason instanceof StateConflictError);
    passed++;
  }
  try {
    for (const other of [approveRequest, rejectRequest]) {
      const r = await seed(true), port = concurrentReads(repo);
      await race(approveRequest(port,{ id:r.id, actorId:actor, actorRole:"Approver" }), other(port,{ id:r.id, actorId:actor, actorRole:"Approver" }));
      const saved = await repo.findById(r.id); assert(saved); assert.equal(saved.approvals.length,1); assert.equal(saved.version,r.version+1);
    }
    for (const submit of [false,true]) {
      const r = await seed(), port = concurrentReads(repo);
      await race(updateRequest(port,{ id:r.id,title:"first" }), submit ? submitRequest(port,{id:r.id,actorId:creator,actorRole:"Applicant"}) : updateRequest(port,{id:r.id,title:"second"}));
      const saved = await repo.findById(r.id); assert(saved); assert.equal(saved.version,r.version+1);
    }
    const r = await seed(true);
    const rejected = r.reject({actorId:actor,approvalId:randomUUID()});
    const rejection = await repo.reject(rejected.request,rejected.approval);
    const revised = await repo.update(rejection.revise());
    const pending = await repo.update(revised.submit());
    const approved = pending.approve({actorId:actor,approvalId:randomUUID()});
    const final = await repo.approve(approved.request,approved.approval);
    assert.equal(final.approvals.length,2); assert.equal(final.status,"Approved"); passed++;
    const draft = await seed();
    await repo.update(draft.delete());
    await assert.rejects(repo.update(draft.update({title:"stale"})), StateConflictError);
    assert.equal((await repo.findById(draft.id))?.status,"Deleted"); passed++;
    // UUID型違反を履歴INSERTで発生させ、先行した状態/version更新もrollbackすることを確認する。
    const rollback = await seed(true);
    const invalid = rollback.approve({actorId:actor,approvalId:"not-a-uuid"});
    await assert.rejects(repo.approve(invalid.request,invalid.approval));
    const unchanged = await repo.findById(rollback.id); assert(unchanged);
    assert.equal(unchanged.status,"Pending"); assert.equal(unchanged.version,rollback.version); assert.equal(unchanged.approvals.length,0); passed++;
    // 新しいDTOへの内部version露出はHTTP側の既存mapper試験で別に確認する。
    console.log(`isolated PostgreSQL concurrency/rollback: ${passed} scenarios passed`);
  } finally { await prisma.$disconnect(); }
}
void main().catch(() => { console.error("isolated PostgreSQL verification failed"); process.exitCode=1; });
