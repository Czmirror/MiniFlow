/** 本番の作成処理を通信fakeで検証する。部分失敗・実行順・対象ID・世代変更を確認し、DOMの操作はブラウザ試験で扱う。 */
import { describe, expect, it, vi } from "vitest";
import type { RequestDto } from "../../../packages/shared/src";
import { runRequestCreation } from "../../../apps/web/src/lib/requestCreation";
import { ApiError } from "../../../apps/web/src/lib/apiTransport";

const draft: RequestDto = {
  id: "created-request", teamId: "team-1", createdBy: "applicant", title: "架空の申請", body: "架空の本文",
  status: "Draft", createdAt: "2026-11-04T00:00:00Z", updatedAt: "2026-11-04T00:00:00Z", deletedAt: null
};
const pending: RequestDto = { ...draft, status: "Pending" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const create = vi.fn(async () => draft);
  const submit = vi.fn(async (_id: string) => pending);
  const onCreated = vi.fn((_request: RequestDto) => {});
  let current = true;
  return { create, submit, onCreated, isCurrent: () => current, invalidate: () => { current = false; } };
}

describe("申請作成と任意の提出", () => {
  it("保存だけなら作成を1回行い、提出を呼ばない", async () => {
    const f = fixture();
    const result = await runRequestCreation({ ...f, submit: undefined });
    expect(result).toEqual({ kind: "saved", request: draft });
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(f.onCreated).toHaveBeenCalledExactlyOnceWith(draft);
    expect(f.submit).not.toHaveBeenCalled();
  });

  it("作成を画面へ通知してから同じIDを1回だけ提出する", async () => {
    const f = fixture();
    const submitting = deferred<RequestDto>();
    f.submit.mockImplementation(id => {
      expect(id).toBe(draft.id);
      expect(f.onCreated).toHaveBeenCalledExactlyOnceWith(draft);
      return submitting.promise;
    });
    const task = runRequestCreation(f);
    await vi.waitFor(() => expect(f.submit).toHaveBeenCalledTimes(1));
    expect(f.onCreated).toHaveBeenCalledExactlyOnceWith(draft);
    submitting.resolve(pending);
    expect(await task).toEqual({ kind: "submitted", request: pending });
    expect(f.create).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("network unavailable"), new ApiError("conflict", 409), new ApiError("authentication required", 401)])(
    "提出失敗でも作成済みIDを返し、自動再送しない: %s", async error => {
      const f = fixture();
      f.submit.mockRejectedValueOnce(error);
      expect(await runRequestCreation(f)).toEqual({ kind: "submission-unknown", request: draft, error });
      expect(f.onCreated).toHaveBeenCalledExactlyOnceWith(draft);
      expect(f.create).toHaveBeenCalledTimes(1);
      expect(f.submit).toHaveBeenCalledExactlyOnceWith(draft.id);
    }
  );

  it("提出は完了して応答だけ失われても、未提出と断定しない", async () => {
    const f = fixture();
    let stored = draft;
    const error = new SyntaxError("response lost");
    f.submit.mockImplementation(async () => { stored = pending; throw error; });
    expect(await runRequestCreation(f)).toEqual({ kind: "submission-unknown", request: draft, error });
    expect(stored.status).toBe("Pending");
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(f.submit).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("create unavailable"), new SyntaxError("create response lost"), new ApiError("authentication required", 401)])(
    "作成応答が得られなければ提出も作成通知も行わない: %s", async error => {
      const f = fixture();
      f.create.mockRejectedValueOnce(error);
      expect(await runRequestCreation(f)).toEqual({ kind: "creation-unknown", error });
      expect(f.create).toHaveBeenCalledTimes(1);
      expect(f.submit).not.toHaveBeenCalled();
      expect(f.onCreated).not.toHaveBeenCalled();
    }
  );
});

describe("作成操作の世代確認", () => {
  it("既に無効な操作では通信しない", async () => {
    const f = fixture(); f.invalidate();
    expect(await runRequestCreation(f)).toBeNull();
    expect(f.create).not.toHaveBeenCalled();
    expect(f.submit).not.toHaveBeenCalled();
    expect(f.onCreated).not.toHaveBeenCalled();
  });

  it.each(["success", "failure"])("境界変更後の作成%sは破棄し、提出しない", async outcome => {
    const f = fixture();
    const creating = deferred<RequestDto>();
    f.create.mockReturnValueOnce(creating.promise);
    const task = runRequestCreation(f);
    f.invalidate();
    if (outcome === "success") creating.resolve(draft);
    else creating.reject(new ApiError("old authentication required", 401));
    expect(await task).toBeNull();
    expect(f.onCreated).not.toHaveBeenCalled();
    expect(f.submit).not.toHaveBeenCalled();
  });

  it("作成通知で境界が変わったら後続の提出を行わない", async () => {
    const f = fixture();
    f.onCreated.mockImplementation(() => f.invalidate());
    expect(await runRequestCreation(f)).toBeNull();
    expect(f.onCreated).toHaveBeenCalledExactlyOnceWith(draft);
    expect(f.submit).not.toHaveBeenCalled();
  });

  it.each(["success", "failure"])("境界変更後の提出%sを新画面へ返さない", async outcome => {
    const f = fixture();
    const submitting = deferred<RequestDto>();
    f.submit.mockReturnValueOnce(submitting.promise);
    const task = runRequestCreation(f);
    await vi.waitFor(() => expect(f.submit).toHaveBeenCalledTimes(1));
    f.invalidate();
    if (outcome === "success") submitting.resolve(pending);
    else submitting.reject(new ApiError("old authentication required", 401));
    expect(await task).toBeNull();
    expect(f.onCreated).toHaveBeenCalledTimes(1);
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(f.submit).toHaveBeenCalledTimes(1);
  });
});
