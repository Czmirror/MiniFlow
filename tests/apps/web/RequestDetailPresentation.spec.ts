/** 本番の表示モデルと詳細部品を検証する。同時刻・日時欠け・古い理由・安全な文字表示・既存権限を照合する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { ApprovalDto, AuthUserDto, RequestDto } from "../../../packages/shared/src";
import { requestDetailPresentation } from "../../../apps/web/src/lib/requestDetailPresentation";
import { formatDate } from "../../../apps/web/src/lib/displayFormat";
import type { Labels } from "../../../apps/web/src/lib/messages";
import { messages } from "../../../apps/web/src/lib/messages";
const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createElement } = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const decision = (id: string, createdAt: string, actionType: ApprovalDto["actionType"] = "Rejected", reason = id): ApprovalDto => ({ id, requestId: "fixture", actedBy: "fixture-actor", createdAt, actionType, reason });
const first = decision("first", "2026-10-28T00:00:00Z");
const last = decision("last", "2026-10-30T00:00:00Z");
const request: RequestDto = { id: "fixture", teamId: "team-1", createdBy: "owner", title: "長い件名 <fixture>", body: "本文 <script>fixture</script>\n2行目", status: "Rejected", createdAt: first.createdAt, updatedAt: last.createdAt, deletedAt: null };
const user: AuthUserDto = { id: "owner", teamId: "team-1", email: "fixture@example.test", displayName: null, language: "ja", role: "Applicant", isActive: true };
const props = { labels: messages.ja, approvals: [last, first], currentUser: user, decisionReason: "", loading: false, request, editForm: { title: request.title, body: request.body }, onEditChange: () => {}, onBack: () => {}, onDelete: () => {}, onDecision: () => {}, onDecisionReasonChange: () => {}, onReviseRequest: () => {}, onSubmitRequest: () => {}, onUpdateRequest: () => {} };
const detailPath = "../../../apps/web/src/components/RequestDetailView";
async function render(overrides: Partial<Omit<typeof props, "labels">> & { labels?: Labels; detailLoading?: boolean; detailFailed?: boolean; onRetry?: () => void } = {}) {
  const { RequestDetailView } = await import(detailPath);
  return renderToStaticMarkup(createElement(RequestDetailView, { ...props, ...overrides }));
}
describe("詳細の表示モデル", () => {
  it("入力を変えず古い順へ並べ、最後の差し戻し理由を選ぶ", () => {
    const input = Object.freeze([last, first]);
    expect(requestDetailPresentation("Rejected", input)).toEqual({ history: [first, last], rejection: last });
    expect(input).toEqual([last, first]);
  });
  it("同時刻はAPI配列の順を保つ", () => {
    const second = { ...last, id: "second" };
    expect(requestDetailPresentation("Rejected", [last, first, second]).history.map(a => a.id)).toEqual(["first", "last", "second"]);
    expect(requestDetailPresentation("Rejected", [last, second]).rejection).toBe(second);
  });
  it("日時欠けを最新だと推測しない", () => {
    const missing = decision("missing", "");
    expect(requestDetailPresentation("Rejected", [missing]).rejection).toBeNull();
    expect(requestDetailPresentation("Rejected", [last, missing, first]).history).toEqual([missing, first, last]);
    expect(formatDate("invalid")).toBe("-");
    expect(formatDate("")).toBe("-");
  });
  it.each(["Draft", "Pending", "Approved", "Deleted"] as const)("%sでは過去の理由を強調しない", status => {
    expect(requestDetailPresentation(status, [last]).rejection).toBeNull();
  });
  it("履歴なし・空理由・最新が承認の場合を区別する", () => {
    expect(requestDetailPresentation("Rejected", []).rejection).toBeNull();
    expect(requestDetailPresentation("Rejected", [{ ...last, reason: "" }]).rejection?.reason).toBe("");
    expect(requestDetailPresentation("Rejected", [first, { ...last, actionType: "Approved" }]).rejection).toBeNull();
  });
});
describe("詳細の本番部品", () => {
  it("状態・理由・本文・操作・履歴の順で安全に表示する", async () => {
    const html = await render({ approvals: [{ ...last, reason: "理由 <img src=x>\n追記" }] });
    expect(html).toContain("理由 &lt;img src=x&gt;\n追記");
    expect(html).toContain("本文 &lt;script&gt;fixture&lt;/script&gt;\n2行目");
    expect(html).not.toContain("<script>");
    expect(html.indexOf("rejection-summary")).toBeLessThan(html.indexOf("detail-layout"));
    expect(html.indexOf("detail-actions")).toBeLessThan(html.indexOf("history-list"));
    expect(html.indexOf("history-list")).toBeLessThan(html.indexOf("detail-footer"));
    expect(html).toContain("下書きに戻す");
  });
  it("空履歴・空理由を区別し日英の説明を表示する", async () => {
    expect(await render({ approvals: [] })).toContain(messages.ja.noApprovalHistory);
    expect(await render({ approvals: [{ ...last, reason: "" }] })).toContain(messages.ja.noReason);
    const en = await render({ labels: messages.en });
    expect(en).toContain("Next action"); expect(en).toContain("Rejection reason"); expect(en).toContain("Oldest decision first");
  });
  it("読込中・失敗は旧申請を表示しない", async () => {
    const pending = await render({ detailLoading: true });
    expect(pending).toContain(messages.ja.detailLoading); expect(pending).not.toContain("長い件名");
    const failed = await render({ detailFailed: true, onRetry: () => {} });
    expect(failed).toContain(messages.ja.detailLoadFailed); expect(failed).toContain(messages.ja.retry); expect(failed).not.toContain("長い件名");
  });
  it.each([
    ["Draft", "Applicant", true, "申請する", true], ["Draft", "Applicant", false, "申請する", false],
    ["Rejected", "Applicant", true, "下書きに戻す", true], ["Rejected", "Approver", false, "下書きに戻す", false],
    ["Pending", "Approver", false, "差し戻し", true], ["Pending", "Approver", true, "差し戻し", false],
    ["Pending", "Applicant", false, "差し戻し", false], ["Draft", "Admin", false, "申請する", true]
  ] as const)("既存の操作条件 %s/%s/owner=%s", async (status, role, own, text, allowed) => {
    const html = await render({ request: { ...request, status }, currentUser: { ...user, role, id: own ? "owner" : "other" }, approvals: [] });
    expect(new RegExp(`<button[^>]*>${text}</button>`).test(html)).toBe(allowed);
  });
  it("未選択には戻る操作を表示する", async () => {
    const { RequestDetailView } = await import(detailPath);
    const html = renderToStaticMarkup(createElement(RequestDetailView, { ...props, request: null }));
    expect(html).toContain(messages.ja.noSelectedRequest);
    expect(html).toContain(">戻る</button>");
    expect(html).not.toContain("長い件名");
  });
  it("送信中は編集・承認入力を無効にする", async () => {
    const html = await render({ request: { ...request, status: "Pending" }, currentUser: { ...user, id: "other", role: "Approver" }, loading: true });
    expect(html).toMatch(/<textarea[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>承認<\/button>/);
  });
});
