/** 本番の下書き編集状態と確認画面を検証する。差分・認証境界・保留操作の消費を調べ、focusと通信は実ブラウザで確認する。 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { hasUnsavedRequest, resolveRequestEditor, transitionRequestEditor } from "../../../apps/web/src/lib/requestEditor";
import { messages } from "../../../apps/web/src/lib/messages";
const source = { id: "fixture-request", title: "架空の下書き", body: "架空の本文\n2行目" };
const scope = JSON.stringify([1, "fixture-user", "team-1", "Admin"]);
const initial = () => resolveRequestEditor(null, scope, source)!;
const dirty = () => transitionRequestEditor(initial(), { type: "edit", form: { ...source, title: "編集中" } }, false).state!;

describe("未保存の下書き", () => {
  it("同じ内容と、編集してから元に戻した内容は未保存でない", () => {
    expect(hasUnsavedRequest(initial())).toBe(false);
    expect(hasUnsavedRequest(transitionRequestEditor(dirty(), { type: "edit", form: source }, false).state)).toBe(false);
    expect(hasUnsavedRequest(null)).toBe(false);
  });
  it.each([{ title: "別の件名", body: source.body }, { title: source.title, body: "別の本文" }, { title: source.title + " ", body: source.body }, { title: source.title, body: source.body + "\n" }, { title: "", body: "" }])("入力を正規化せず比較する: %j", form => {
    expect(hasUnsavedRequest(transitionRequestEditor(initial(), { type: "edit", form }, false).state)).toBe(true);
  });
  it.each(["other-user", "other-team", "other-role", "new-session"])("境界変更では旧入力と保留操作を使わない: %s", changedScope => {
    const pending = transitionRequestEditor(dirty(), { type: "leave", intent: "logout" }, false).state;
    const next = resolveRequestEditor(pending, changedScope, source);
    expect(next?.form).toEqual({ title: source.title, body: source.body });
    expect(next?.pending).toBeNull();
    expect(hasUnsavedRequest(next)).toBe(false);
  });
  it("別申請・保存結果・非編集画面では旧入力を破棄する", () => {
    expect(resolveRequestEditor(dirty(), scope, { ...source, id: "other-request" })?.form.title).toBe(source.title);
    const saved = resolveRequestEditor(dirty(), scope, { ...source, title: "保存済みの変更" });
    expect(saved?.form.title).toBe("保存済みの変更");
    expect(hasUnsavedRequest(saved)).toBe(false);
    expect(resolveRequestEditor(dirty(), scope, null)).toBeNull();
  });
  it.each(["requests", "mine", "dashboard", "logout"] as const)("変更があるときだけ移動を保留し、確定を1回だけ返す: %s", intent => {
    expect(transitionRequestEditor(initial(), { type: "leave", intent }, false).intent).toBe(intent);
    const pending = transitionRequestEditor(dirty(), { type: "leave", intent }, false);
    expect(pending.intent).toBeNull();
    expect(pending.state?.pending).toBe(intent);
    const confirmed = transitionRequestEditor(pending.state, { type: "confirm" }, false);
    expect(confirmed.intent).toBe(intent);
    expect(confirmed.state?.pending).toBeNull();
    expect(transitionRequestEditor(confirmed.state, { type: "confirm" }, false).intent).toBeNull();
    // ログアウト失敗時にも捨てず、実際の移動成功で呼び出し元が初期化する。
    expect(hasUnsavedRequest(confirmed.state)).toBe(true);
  });
  it("キャンセルでは入力を保ち、移動しない", () => {
    const state = transitionRequestEditor(dirty(), { type: "leave", intent: "requests" }, false).state;
    const cancelled = transitionRequestEditor(state, { type: "cancel" }, false);
    expect(cancelled.intent).toBeNull();
    expect(cancelled.state?.form.title).toBe("編集中");
    expect(cancelled.state?.pending).toBeNull();
  });
  it.each(["leave", "confirm"] as const)("送信中は移動と保留中の操作を実行しない: %s", type => {
    const state = transitionRequestEditor(dirty(), { type: "leave", intent: "requests" }, false).state;
    const result = transitionRequestEditor(state, type === "leave" ? { type, intent: "logout" } : { type }, true);
    expect(result.state).toBe(state);
    expect(result.intent).toBeNull();
  });
  it("同じ保存基準と失敗時には編集を維持する", () => {
    const edited = dirty();
    expect(resolveRequestEditor(edited, scope, source)).toBe(edited);
    expect(hasUnsavedRequest(resolveRequestEditor(edited, scope, source))).toBe(true);
  });
  it("初期化後の確定では旧移動を実行しない", () => {
    const state = transitionRequestEditor(dirty(), { type: "leave", intent: "users" }, false).state;
    expect(transitionRequestEditor(resolveRequestEditor(state, "new-scope", source), { type: "confirm" }, false).intent).toBeNull();
  });
});

describe("未保存の確認UI", () => {
  it("日英の選択肢と初期focus・無効状態を表示し、ログアウト先を区別する", async () => {
    const webRequire = createRequire(`${process.cwd()}/apps/web/package.json`);
    const { createElement } = webRequire("react");
    const { renderToStaticMarkup } = webRequire("react-dom/server");
    const path = "../../../apps/web/src/components/RequestLeaveDialog";
    const { RequestLeaveDialog } = await import(path);
    const props = { disabled: false, onCancel: () => {}, onConfirm: () => {} };
    const ja = renderToStaticMarkup(createElement(RequestLeaveDialog, { ...props, labels: messages.ja, logout: false }));
    expect(ja).toContain("編集を続ける");
    expect(ja).toContain("変更を破棄して移動する");
    expect(ja).toContain('autofocus=""');
    expect(ja).toContain('method="dialog"');
    const en = renderToStaticMarkup(createElement(RequestLeaveDialog, { ...props, labels: messages.en, logout: true, disabled: true }));
    expect(en).toContain("Keep editing");
    expect(en).toContain("Discard and log out");
    expect(en).toContain("disabled");
  });
});
