/** 本番の削除表示条件と詳細・確認UIを検証する。通信・focus・確定操作は実ブラウザで確認する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { AuthUserDto, RequestDto } from "../../../packages/shared/src";
import { canDeleteRequest } from "../../../apps/web/src/lib/canDeleteRequest";
import { messages } from "../../../apps/web/src/lib/messages";
const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createElement } = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const detailPath = "../../../apps/web/src/components/MiniFlowApp";
const actionPath = "../../../apps/web/src/components/RequestDeleteAction";
const request: RequestDto = { id: "fixture-request", teamId: "team-1", createdBy: "owner", title: "架空の申請 <fixture>", body: "fixture", status: "Draft", createdAt: "2026-10-28T00:00:00Z", updatedAt: "2026-10-28T00:00:00Z", deletedAt: null };
const user: AuthUserDto = { id: "owner", teamId: "team-1", email: "fixture@example.test", displayName: null, language: "ja", role: "Applicant", isActive: true };
const cases: Array<{ status: RequestDto["status"]; role: AuthUserDto["role"]; owner: boolean; sameTeam: boolean; allowed: boolean }> = [
  { status: "Draft", role: "Applicant", owner: true, sameTeam: true, allowed: true },
  { status: "Rejected", role: "Applicant", owner: true, sameTeam: true, allowed: true },
  { status: "Draft", role: "Approver", owner: true, sameTeam: true, allowed: true },
  { status: "Draft", role: "Admin", owner: false, sameTeam: true, allowed: true },
  { status: "Rejected", role: "Admin", owner: false, sameTeam: true, allowed: true },
  { status: "Draft", role: "Applicant", owner: false, sameTeam: true, allowed: false },
  { status: "Rejected", role: "Approver", owner: false, sameTeam: true, allowed: false },
  { status: "Draft", role: "Admin", owner: false, sameTeam: false, allowed: false },
  { status: "Rejected", role: "Applicant", owner: true, sameTeam: false, allowed: false },
  { status: "Pending", role: "Admin", owner: true, sameTeam: true, allowed: false },
  { status: "Approved", role: "Admin", owner: false, sameTeam: true, allowed: false },
  { status: "Deleted", role: "Admin", owner: true, sameTeam: true, allowed: false }
];
describe("申請削除の表示条件", () => {
  it.each(cases)("$status/$role/owner=$owner/sameTeam=$sameTeam → $allowed", ({ status, role, owner, sameTeam, allowed }) => {
    expect(canDeleteRequest({ ...request, status }, { ...user, role, id: owner ? "owner" : "other", teamId: sameTeam ? "team-1" : "team-2" })).toBe(allowed);
  });
  it("申請や本人がない場合は表示しない", () => {
    expect(canDeleteRequest(null, user)).toBe(false);
    expect(canDeleteRequest(request, null)).toBe(false);
  });
  it("本番詳細は削除できる場合だけ操作を接続する", async () => {
    const { RequestDetailView } = await import(detailPath);
    const props = { labels: messages.ja, approvals: [], currentUser: user, decisionReason: "", loading: false, onBack: () => {}, onDelete: () => {}, onDecision: () => {}, onDecisionReasonChange: () => {}, onReviseRequest: () => {}, onSubmitRequest: () => {}, onUpdateRequest: () => {} };
    const draft = renderToStaticMarkup(createElement(RequestDetailView, { ...props, request }));
    expect(draft).toContain("この申請を削除");
    const pending = renderToStaticMarkup(createElement(RequestDetailView, { ...props, request: { ...request, status: "Pending" } }));
    expect(pending).not.toContain("この申請を削除");
  });
  it("確認は申請名を安全に表示し、日英の注意とキャンセルを持つ", async () => {
    const { RequestDeleteAction } = await import(actionPath);
    const ja = renderToStaticMarkup(createElement(RequestDeleteAction, { title: request.title, labels: messages.ja, disabled: false, onConfirm: () => {} }));
    expect(ja).toContain("架空の申請 &lt;fixture&gt;");
    expect(ja).toContain("削除後は画面から元に戻せません");
    expect(ja).toContain("未保存の変更も破棄されます");
    expect(ja).toContain('method="dialog"');
    expect(ja).toContain("キャンセル");
    expect(ja).toContain('autofocus=""');
    const en = renderToStaticMarkup(createElement(RequestDeleteAction, { title: request.title, labels: messages.en, disabled: true, onConfirm: () => {} }));
    expect(en).toContain("You cannot restore this request from the app.");
    expect(en).toContain("Cancel");
    expect(en).toContain("disabled");
  });
});
