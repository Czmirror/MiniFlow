/** 本番Webクライアントで401からの復帰契約と、更新前のCSRF取得・同時取得の共有・認証変更中の取得無効化を確認する。 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearCsrfToken, csrfHeaders } from "../../../apps/web/src/lib/apiTransport";
import { fetchCurrentUser, listUsers, logout, updateAccount } from "../../../apps/web/src/lib/authApi";
import { listRequests, updateRequest } from "../../../apps/web/src/lib/requestApi";
const api = "http://fixture.invalid";
const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => { clearCsrfToken(); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe("Webの認証とCSRF取得", () => {
  it.each([
    ["申請一覧", () => listRequests(api), false], ["申請更新", () => updateRequest(api, "fixture-id", { title: "更新" }), true],
    ["アカウント更新", () => updateAccount(api, {}), true], ["ユーザー一覧", () => listUsers(api), false], ["ログアウト", () => logout(api), true]
  ] as const)("%sの401をstatus付きで伝える", async (_name, operation, mutation) => {
    if (mutation) fetchMock.mockResolvedValueOnce(json({ csrfToken: "fixture-token" }));
    fetchMock.mockResolvedValueOnce(new Response("not JSON", { status: 401 }));
    await expect(operation()).rejects.toMatchObject({ name: "ApiError", status: 401 });
  });
  it("CSRF取得401では更新要求を送らない", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401));
    await expect(updateAccount(api, {})).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("初期確認401を未ログインとして返す", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401));
    expect(await fetchCurrentUser(api)).toBeNull();
  });
  it("403と通信障害を認証失効に変換しない", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 403));
    await expect(listUsers(api)).rejects.toMatchObject({ status: 403 });
    const failure = new TypeError("fixture network unavailable");
    fetchMock.mockRejectedValueOnce(failure);
    await expect(listRequests(api)).rejects.toBe(failure);
  });
  it("同時取得を共有し、完了後は次のsessionのtokenを取り直す", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    const a = csrfHeaders(api), b = csrfHeaders(api);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(json({ csrfToken: "first-fixture-token" }));
    expect(await Promise.all([a, b])).toEqual([{ "x-csrf-token": "first-fixture-token" }, { "x-csrf-token": "first-fixture-token" }]);
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "second-fixture-token" }));
    expect(await csrfHeaders(api)).toEqual({ "x-csrf-token": "second-fixture-token" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("失敗後に再取得できる", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("unavailable"));
    await expect(csrfHeaders(api)).rejects.toThrow("unavailable");
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "retry-fixture-token" }));
    expect(await csrfHeaders(api)).toEqual({ "x-csrf-token": "retry-fixture-token" });
  });
  it("認証初期化前の遅い取得を更新へ使わない", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    const operation = updateAccount(api, {});
    clearCsrfToken();
    resolve(json({ csrfToken: "stale-fixture-token" }));
    await expect(operation).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
