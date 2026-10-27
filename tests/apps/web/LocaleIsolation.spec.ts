/** 本番のダッシュボードを異なる言語で交互に描画し、保持済みの画面要素と文言が干渉しないことを確認する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { messages } from "../../../apps/web/src/lib/messages";

// ReactはWebの既存依存を使う。root/testsにはJSX設定を追加せず、画面本体の型はWebの型検査で確認する。
const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createElement } = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const componentPath = "../../../apps/web/src/components/MiniFlowApp";

const stats = { total: 3, mine: 1, pending: 1, approved: 1, rejected: 0, drafts: 1 };
const pending = [{ id: "fixture-request", teamId: "team-1", createdBy: "fixture-applicant", title: "Fixture request", body: "fixture", status: "Pending", createdAt: "2026-10-27T00:00:00Z", updatedAt: "2026-10-27T00:00:00Z", deletedAt: null }];

describe("画面ごとの表示言語", () => {
  it("交互に作った日英の画面要素を後から描画しても、見出し・表・状態・操作の言語を維持する", async () => {
    const { Dashboard } = await import(componentPath);
    const japanese = createElement(Dashboard, { labels: messages.ja, stats, pendingApprovals: pending, onOpenDetail: () => {} });
    const english = createElement(Dashboard, { labels: messages.en, stats, pendingApprovals: pending, onOpenDetail: () => {} });
    const en = renderToStaticMarkup(english);
    const ja = renderToStaticMarkup(japanese);
    expect(en).toContain("Dashboard");
    expect(en).toContain("Requester");
    expect(en).toContain("Pending");
    expect(en).toContain("Detail");
    expect(en).not.toContain("承認待ち");
    expect(ja).toContain("ダッシュボード");
    expect(ja).toContain("申請者");
    expect(ja).toContain("承認待ち");
    expect(ja).toContain("詳細");
    expect(ja).not.toContain("Requester");
    expect(renderToStaticMarkup(english)).toBe(en);
  });

  it("日本語と英語で文言と申請状態のキーが揃っている", () => {
    expect(Object.keys(messages.ja).sort()).toEqual(Object.keys(messages.en).sort());
    expect(Object.keys(messages.ja.statusLabels).sort()).toEqual(Object.keys(messages.en.statusLabels).sort());
  });
});
