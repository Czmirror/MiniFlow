/** 本番の移動先・一覧位置・Dashboard出力を照合する。通信とfocusは実ブラウザで確認する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { resolveDashboardShortcut } from "../../../apps/web/src/lib/dashboardShortcut";
import { changeRequestListSelection, createRequestListSelection } from "../../../apps/web/src/lib/requestListSelection";
import { messages } from "../../../apps/web/src/lib/messages";

describe("ダッシュボードの移動先", () => {
  it.each([
    ["total", "requests", ""], ["mine", "mine", ""], ["pending", "requests", "Pending"],
    ["approved", "requests", "Approved"], ["rejected", "requests", "Rejected"], ["drafts", "requests", "Draft"],
    ["pendingApprovals", "pending", ""]
  ])("%sは%sの指定条件を開く", (key, view, status) => {
    expect(resolveDashboardShortcut(key)).toEqual({ view, status });
  });
  it.each(["", "unknown", "__proto__", "https://example.test"])("未知の指定は移動しない: %s", key => {
    expect(resolveDashboardShortcut(key)).toBeNull();
  });
  it("同じ条件でも対象だけ先頭へ戻し、ほかの一覧を保つ", () => {
    const initial = createRequestListSelection("fixture-identity");
    const previous = { ...initial, requests: { page: 3, status: "Draft" as const }, mine: { page: 2, status: "Rejected" as const } };
    const next = changeRequestListSelection(previous, "fixture-identity", "requests", { type: "open", value: "Draft" });
    expect(next.requests).toEqual({ page: 1, status: "Draft" });
    expect(next.mine).toBe(previous.mine);
    expect(next.pending).toBe(previous.pending);
    expect(changeRequestListSelection(previous, "fixture-identity", "requests", { type: "status", value: "Draft" })).toBe(previous);
  });
  it("全状態へ開き直し、不正な対象と状態は無視する", () => {
    const initial = createRequestListSelection("fixture-identity");
    const previous = { ...initial, mine: { page: 2, status: "Rejected" as const } };
    expect(changeRequestListSelection(previous, "fixture-identity", "mine", { type: "open", value: "" }).mine).toEqual({ page: 1, status: "" });
    for (const [view, value] of [["detail", "Draft"], ["requests", "Deleted"], ["pending", "Draft"]]) {
      expect(changeRequestListSelection(previous, "fixture-identity", view, { type: "open", value })).toBe(previous);
    }
  });
  it("認証境界が変われば旧一覧の位置を持ち越さない", () => {
    const previous = { ...createRequestListSelection("old"), mine: { page: 2, status: "Rejected" as const } };
    const next = changeRequestListSelection(previous, "new", "requests", { type: "open", value: "Pending" });
    expect(next.identity).toBe("new");
    expect(next.mine).toEqual({ page: 1, status: "" });
    expect(next.requests).toEqual({ page: 1, status: "Pending" });
  });
  it("本番Dashboardは日英で6枚の操作と全件操作を表示する", async () => {
    const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
    const { createElement } = webRequire("react");
    const { renderToStaticMarkup } = webRequire("react-dom/server");
    const path = "../../../apps/web/src/components/MiniFlowApp";
    const { Dashboard } = await import(path);
    for (const labels of [messages.ja, messages.en]) {
      const html = renderToStaticMarkup(createElement(Dashboard, { labels,
        stats: { total: 46, mine: 25, pending: 21, approved: 3, rejected: 0, drafts: 22 },
        pendingApprovals: [], onOpenDetail: () => {}, onOpenList: () => {} }));
      expect(html.match(/class="metric"/g)).toHaveLength(6);
      for (const hint of Object.values(labels.metricActions)) expect(html).toContain(hint);
      expect(html).toContain(labels.viewAll);
      expect(html).toContain(labels.pendingApprovalsHint);
      expect(html).toContain("<strong>0</strong>");
      expect(html).toContain(labels.noPendingApprovals);
    }
  });
});
