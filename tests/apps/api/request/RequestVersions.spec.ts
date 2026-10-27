/** 本番ドメインとPrisma保存契約で、全遷移のversion引継ぎ・条件付き保存・競合分類を確認する。実DBは別試験。 */
import { describe, expect, it, vi } from "vitest";
import { requestInState } from "../../../support/requests";
import { Request } from "../../../../apps/api/src/domain/request/Request";
import { PrismaRequestRepository } from "../../../../apps/api/src/infrastructure/repositories/PrismaRequestRepository";
import { StateConflictError } from "../../../../apps/api/src/domain/errors/StateConflictError";

describe("申請の保存version", () => {
  it("取得versionは全遷移で保持し、作成時は0", () => {
    expect(requestInState().version).toBe(0);
    const draft = Request.rehydrate({ ...requestInState(), version: 7 });
    for (const r of [draft.update({title:"edit"}),draft.submit(),draft.delete()]) expect(r.version).toBe(7);
    const pending = draft.submit();
    const approved = pending.approve({actorId:"actor",approvalId:"approval"});
    const rejected = pending.reject({actorId:"actor",approvalId:"rejection"});
    expect(approved.request.version).toBe(7); expect(rejected.request.version).toBe(7);
    expect(rejected.request.revise().version).toBe(7); expect(rejected.request.delete().version).toBe(7);
    for (const version of [-1,1.5,NaN]) expect(() => Request.rehydrate({...draft,version})).toThrow();
  });
  it("通常更新に取得versionとincrementを渡し、成功後versionを返す", async () => {
    const r = Request.rehydrate({...requestInState(),version:3});
    const update = vi.fn().mockResolvedValue({...r,version:4});
    const repo = new PrismaRequestRepository({requestRecord:{update}} as never);
    expect((await repo.update(r.update({title:"changed"}))).version).toBe(4);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({where:{id:r.id,version:3},data:expect.objectContaining({version:{increment:1}})}));
  });
  it("条件不一致だけを競合へ変え、未知DB障害はそのまま伝える", async () => {
    const update = vi.fn().mockRejectedValueOnce({code:"P2025"}).mockRejectedValueOnce(new Error("storage unavailable"));
    const repo = new PrismaRequestRepository({requestRecord:{update}} as never);
    await expect(repo.update(requestInState())).rejects.toBeInstanceOf(StateConflictError);
    await expect(repo.update(requestInState())).rejects.toThrow("storage unavailable");
  });
});
