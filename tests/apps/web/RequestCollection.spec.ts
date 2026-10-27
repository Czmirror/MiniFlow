/** 本番のページ取得調整を検証する。通信I/Oのみ置き換え、補正・失敗・旧応答の境界を確認する。 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRequestCollection } from "../../../apps/web/src/lib/requestCollection";

afterEach(() => vi.unstubAllGlobals());
const summary = { total: 41, mine: 21, pending: 3, approved: 20, rejected: 0, drafts: 18 };
function response(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } }); }

describe("ページ読込の境界", () => {
  it("空になった最終ページを一度だけ補正する", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(url);
      if (url.endsWith("/summary")) return response(summary);
      const page = Number(new URL(url).searchParams.get("page"));
      return response({ items: [], page, limit: 20, total: 21 });
    }));
    const result = await loadRequestCollection("http://fixture.test", "mine", 3, false, () => true);
    expect(result?.listing.page).toBe(2);
    expect(urls).toContain("http://fixture.test/requests?includeDeleted=false&scope=mine&page=2&limit=20");
    expect(urls.length).toBe(3);
  });

  it("補正中にさらに件数が減ったときは不正なページを表示せず再取得を促す", async () => {
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/summary")) return response(summary);
      count++;
      return response({ items: [], page: count === 1 ? 3 : 2, limit: 20, total: count === 1 ? 21 : 0 });
    }));
    await expect(loadRequestCollection("http://fixture.test", "all", 3, false, () => true)).rejects.toThrow("再読み込み");
    expect(count).toBe(2);
  });

  it("0件は1ページへ補正する", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/summary") ? response(summary)
      : response({ items: [], page: Number(new URL(url).searchParams.get("page")), limit: 20, total: 0 })));
    expect((await loadRequestCollection("http://fixture.test", "all", 5, false, () => true))?.listing.page).toBe(1);
  });

  it("画面・認証の変化で無効になった応答は適用対象にしない", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/summary") ? response(summary) : response({ items: [], page: 1, limit: 20, total: 41 })));
    expect(await loadRequestCollection("http://fixture.test", "all", 1, false, () => false)).toBeNull();
  });

  it("集計の失敗を0件や一覧の成功として返さない", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/summary") ? new Response("{}", { status: 500 }) : response({ items: [], page: 1, limit: 20, total: 41 })));
    await expect(loadRequestCollection("http://fixture.test", "all", 1, false, () => true)).rejects.toThrow();
  });
});
