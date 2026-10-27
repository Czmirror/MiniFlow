/** 明示承認された使い捨てPostgreSQLだけで、Prismaの件数境界と同時刻のページ順を確認する。通常testからは起動しない。 */
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PrismaClient } from "../../apps/api/node_modules/@prisma/client";
import { PrismaRequestRepository } from "../../apps/api/src/infrastructure/repositories/PrismaRequestRepository";

async function main() {
  const raw = process.env.PAGINATION_TEST_DATABASE_URL;
  if (!raw) throw new Error("explicit disposable database URL required");
  const url = new URL(raw);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/miniflow_pagination_check" || url.username !== "miniflow_pagination") throw new Error("isolated pagination database guard rejected target");
  const prisma = new PrismaClient({ datasourceUrl: raw, log: [] });
  const repo = new PrismaRequestRepository(prisma);
  const actorId = randomUUID();
  try {
    for (const count of [0, 20, 21, 40, 41]) {
      const teamId = `boundary-${randomUUID()}`;
      const ids = Array.from({ length: count }, () => randomUUID()).sort().reverse();
      if (count) await prisma.requestRecord.createMany({ data: ids.map(id => ({ id, teamId, createdBy: actorId, title: "boundary fixture", body: "fixture", status: "Draft", createdAt: new Date("2026-01-01") })) });
      const actual = [];
      for (let page = 1; page <= Math.max(1, Math.ceil(count / 20)); page++) {
        const result = await repo.list({ teamId, page, limit: 20, includeDeleted: false });
        assert.equal(result.total, count);
        actual.push(...result.items.map(r => r.id));
      }
      assert.deepEqual(actual, ids);
      assert.deepEqual(await repo.summary(teamId, actorId), { total: count, mine: count, pending: 0, approved: 0, rejected: 0, drafts: count });
      assert.equal((await repo.list({ teamId, createdBy: randomUUID(), page: 1, limit: 20, includeDeleted: false })).total, 0);
      console.log(`PostgreSQL boundary ${count}: passed`);
    }
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "pagination integration failed"); process.exitCode = 1; });
