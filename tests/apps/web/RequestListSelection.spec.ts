/** 本番の一覧選択状態を検証する。画面別の保持、入力拒否、認証境界と補正後の位置を確認し、通信は行わない。 */
import { describe, expect, it } from "vitest";
import { changeRequestListSelection, createRequestListSelection, readRequestListSelection } from "../../../apps/web/src/lib/requestListSelection";

const identity = JSON.stringify(["fixture-user", "team-1", "Admin"]);
const page = (state: ReturnType<typeof createRequestListSelection>, view: string, value: number, lastPage = 4) =>
  changeRequestListSelection(state, identity, view, { type: "page", page: value, lastPage });

describe("一覧別のページ位置", () => {
  it("各一覧の位置を詳細・別画面経由でも独立して読み出す", () => {
    let state = createRequestListSelection(identity);
    state = page(state, "requests", 2);
    state = page(state, "mine", 3);
    state = page(state, "pending", 4);
    expect(readRequestListSelection(state, identity, "detail")).toEqual({ page: 1, status: "" });
    expect(readRequestListSelection(state, identity, "dashboard")).toEqual({ page: 1, status: "" });
    expect(readRequestListSelection(state, identity, "requests").page).toBe(2);
    expect(readRequestListSelection(state, identity, "mine").page).toBe(3);
    expect(readRequestListSelection(state, identity, "pending").page).toBe(4);
  });
  it("条件変更は当該一覧だけ先頭へ戻し、同じ条件の再選択では位置を保つ", () => {
    let state = page(page(createRequestListSelection(identity), "requests", 2), "mine", 3);
    state = changeRequestListSelection(state, identity, "requests", { type: "status", value: "Draft" });
    expect(state.requests).toEqual({ page: 1, status: "Draft" });
    expect(state.mine.page).toBe(3);
    state = page(state, "requests", 2);
    expect(changeRequestListSelection(state, identity, "requests", { type: "status", value: "Draft" })).toBe(state);
    expect(changeRequestListSelection(state, identity, "requests", { type: "status", value: "" }).requests).toEqual({ page: 1, status: "" });
  });
  it.each([0, -1, 1.5, NaN, Infinity, 5, Number.MAX_SAFE_INTEGER + 1])("不正・範囲外のページを無視する: %s", value => {
    const state = page(createRequestListSelection(identity), "requests", 2);
    expect(page(state, "requests", value)).toBe(state);
  });
  it("未知条件と選択を持たない画面への操作を無視する", () => {
    const state = page(createRequestListSelection(identity), "requests", 2);
    for (const view of ["dashboard", "detail", "other"]) expect(page(state, view, 3)).toBe(state);
    for (const value of ["Deleted", "Other", " Draft "]) expect(changeRequestListSelection(state, identity, "requests", { type: "status", value })).toBe(state);
    expect(changeRequestListSelection(state, identity, "pending", { type: "status", value: "Draft" })).toBe(state);
  });
  it.each([JSON.stringify(["other-user", "team-1", "Admin"]), JSON.stringify(["fixture-user", "team-2", "Admin"]), JSON.stringify(["fixture-user", "team-1", "Applicant"]), ""])("別の本人・所属・権限・未認証では旧位置を使わない: %s", nextIdentity => {
    const state = page(createRequestListSelection(identity), "mine", 3);
    expect(readRequestListSelection(state, nextIdentity, "mine")).toEqual({ page: 1, status: "" });
    const next = changeRequestListSelection(state, nextIdentity, "requests", { type: "page", page: 2, lastPage: 3 });
    expect(next.identity).toBe(nextIdentity);
    expect(next.mine).toEqual({ page: 1, status: "" });
  });
  it("同じ認証境界は維持し、reset後は同じ本人でも初期位置になる", () => {
    const state = page(createRequestListSelection(identity), "requests", 2);
    expect(readRequestListSelection(state, identity, "requests").page).toBe(2);
    expect(readRequestListSelection(createRequestListSelection(""), identity, "requests").page).toBe(1);
  });
  it("取得で補正された最後のページを記憶し、0件は先頭へ戻す", () => {
    let state = page(createRequestListSelection(identity), "requests", 4);
    state = page(state, "requests", 2, 2);
    expect(readRequestListSelection(state, identity, "requests").page).toBe(2);
    state = page(state, "requests", 1, 1);
    expect(readRequestListSelection(state, identity, "requests").page).toBe(1);
  });
});
