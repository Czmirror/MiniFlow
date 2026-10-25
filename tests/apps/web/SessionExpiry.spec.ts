/** 本番Webクライアントへ401を返し、HTTP status伝達とCSRF再取得、403/通信失敗との区別を確認する。 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearCsrfToken, csrfHeaders } from "../../../apps/web/src/lib/apiTransport";
import { fetchCurrentUser, listUsers, logout, updateAccount } from "../../../apps/web/src/lib/authApi";
import { listRequests, updateRequest } from "../../../apps/web/src/lib/requestApi";

const api = "http://fixture.invalid";
const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => { clearCsrfToken(); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe("Webのセッション失効", () => {
  it.each([
    ["申請一覧", () => listRequests(api)],
    ["申請更新", () => updateRequest(api, "fixture-id", { title: "更新" })],
    ["アカウント更新", () => updateAccount(api, { displayName: "fixture" })],
    ["ユーザー一覧", () => listUsers(api)],
    ["ログアウト", () => logout(api)]
  ] as const)("%sの401でstatusを伝え、古いCSRFを破棄する", async (_name, operation) => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "old-fixture-token" }));
    await csrfHeaders(api);
    fetchMock.mockResolvedValueOnce(new Response("not JSON", { status: 401 }));
    await expect(operation()).rejects.toMatchObject({ name: "ApiError", status: 401 });
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "new-fixture-token" }));
    expect(await csrfHeaders(api)).toEqual({ "x-csrf-token": "new-fixture-token" });
    expect(fetchMock).toHaveBeenLastCalledWith(`${api}/auth/csrf`, expect.any(Object));
  });

  it("CSRF取得の401も認証失効として伝え、更新要求を送らない", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: "authentication required" } }, 401));
    await expect(updateAccount(api, {})).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("初期確認の401は未ログインとして返し、CSRFを破棄する", async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "old-fixture-token" }));
    await csrfHeaders(api);
    fetchMock.mockResolvedValueOnce(json({}, 401));
    expect(await fetchCurrentUser(api)).toBeNull();
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "new-fixture-token" }));
    expect(await csrfHeaders(api)).toEqual({ "x-csrf-token": "new-fixture-token" });
  });

  it("403は401と区別し、CSRFを破棄しない", async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: "kept-fixture-token" }));
    await csrfHeaders(api);
    fetchMock.mockResolvedValueOnce(json({ error: { message: "forbidden" } }, 403));
    await expect(listUsers(api)).rejects.toMatchObject({ status: 403, message: "forbidden" });
    expect(await csrfHeaders(api)).toEqual({ "x-csrf-token": "kept-fixture-token" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("通信失敗を認証失効に変換しない", async () => {
    const failure = new TypeError("fixture network unavailable");
    fetchMock.mockRejectedValueOnce(failure);
    await expect(listRequests(api)).rejects.toBe(failure);
  });
});
