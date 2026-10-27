/** 実際に詳細取得を待つ途中で世代が変わった場合の成功・失敗を、本番の応答ガードで確認する。 */
import { describe, expect, it } from "vitest";
import type { RequestDetailDto } from "../../../packages/shared/src";
import { currentRequestDetail } from "../../../apps/web/src/lib/currentRequestDetail";

const detail: RequestDetailDto = { request: { id: "old-team", teamId: "team-1", createdBy: "applicant", title: "申請", body: "本文", status: "Draft", createdAt: "2026-10-27T00:00:00Z", updatedAt: "2026-10-27T00:00:00Z", deletedAt: null }, approvals: [] };

describe("詳細取得の世代確認", () => {
  it("取得中に所属が変わった成功応答を破棄する", async () => {
    let generation = 1;
    let resolve!: (value: RequestDetailDto) => void;
    const result = currentRequestDetail(() => new Promise(r => { resolve = r; }), () => generation === 1);
    generation++;
    resolve(detail);
    expect(await result).toBeNull();
  });
  it("認証破棄後の古いエラーも破棄する", async () => {
    let current = true;
    let reject!: (error: Error) => void;
    const result = currentRequestDetail(() => new Promise((_, r) => { reject = r; }), () => current);
    current = false;
    reject(new Error("old detail error"));
    expect(await result).toBeNull();
  });
  it("現在の成功は返し、現在の失敗は呼び出し元へ伝える", async () => {
    expect(await currentRequestDetail(async () => detail, () => true)).toBe(detail);
    await expect(currentRequestDetail(async () => { throw new Error("current error"); }, () => true)).rejects.toThrow("current error");
  });
});
