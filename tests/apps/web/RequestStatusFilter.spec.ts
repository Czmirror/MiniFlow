/** 本番の選択肢変換と一覧表示を検証する。通信・取得寿命は取得処理の試験と実ブラウザで確認する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { parseRequestStatusFilter, requestStatusOptions } from "../../../apps/web/src/lib/requestStatusFilter";
import { messages } from "../../../apps/web/src/lib/messages";
const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createElement } = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const componentPath = "../../../apps/web/src/components/MiniFlowApp";

describe("一覧の状態条件", () => {
  it("解除と4状態だけを許可し、削除済み・未知・空白を拒否する", () => {
    expect(parseRequestStatusFilter("")).toBe("");
    expect(requestStatusOptions.map(parseRequestStatusFilter)).toEqual(["Draft", "Pending", "Approved", "Rejected"]);
    for (const value of ["Deleted", "Other", " Pending ", "pending"]) expect(parseRequestStatusFilter(value)).toBeNull();
  });
  it("0件と失敗を区別し、どちらも選択欄を維持する", async () => {
    const { RequestList } = await import(componentPath);
    const props = { labels: messages.ja, title: "申請一覧", statusFilter: "Approved", loading: false, onReload: () => {}, onStatusChange: () => {}, onPage: () => {}, onOpenDetail: () => {} };
    const empty = renderToStaticMarkup(createElement(RequestList, { ...props, listing: { items: [], total: 0, page: 1, limit: 20 }, error: null }));
    expect(empty).toContain("条件に一致する申請はありません");
    expect(empty).toContain('value="Approved" selected');
    expect(empty).not.toContain('value="Deleted"');
    const failed = renderToStaticMarkup(createElement(RequestList, { ...props, listing: null, error: "fixture unavailable" }));
    expect(failed).toContain("fixture unavailable");
    expect(failed).toContain("再読み込み");
    expect(failed).toContain('value="Approved" selected');
    expect(failed).not.toContain("条件に一致する申請はありません");
    expect(failed).not.toContain("0–0");
  });
});
