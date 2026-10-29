/** 一覧別の位置をログイン中だけ保持するための純粋な状態操作。取得hookから使い、通信や認可は行わない。 */
import { parseRequestStatusFilter } from "./requestStatusFilter";
import type { RequestStatusFilter } from "./requestStatusFilter";

/** 詳細やダッシュボードは位置を持たず、この3画面だけが独立した選択を持つ。 */
export type RequestListView = "requests" | "mine" | "pending";
type Position = { page: number; status: RequestStatusFilter };
/** identityは本人・所属・権限の既存識別子。別identityの位置を読み出さない。 */
export type RequestListSelection = { identity: string } & Record<RequestListView, Position>;
type SelectionChange = { type: "page"; page: number; lastPage: number } | { type: "status"; value: string } | { type: "open"; value: string };

/** 一覧以外の画面名を選択状態のキーにしない。 */
export function isRequestListView(view: string): view is RequestListView {
  return view === "requests" || view === "mine" || view === "pending";
}

/** 新しい認証境界では、全一覧を先頭・条件なしに初期化する。 */
export function createRequestListSelection(identity: string): RequestListSelection {
  return { identity, requests: { page: 1, status: "" }, mine: { page: 1, status: "" }, pending: { page: 1, status: "" } };
}

/** 別identityの状態は参照せず、非一覧画面は常に先頭・条件なしを返す。 */
export function readRequestListSelection(state: RequestListSelection, identity: string, view: string): Position {
  return state.identity === identity && isRequestListView(view) ? state[view] : { page: 1, status: "" };
}

/** 不正入力は無視する。openは対象一覧だけ指定条件の先頭へ戻し、通常の条件変更は同値なら位置を保つ。 */
export function changeRequestListSelection(state: RequestListSelection, identity: string, view: string, change: SelectionChange): RequestListSelection {
  const current = state.identity === identity ? state : createRequestListSelection(identity);
  if (!isRequestListView(view)) return current;
  const position = current[view];
  if (change.type === "open") {
    const status = parseRequestStatusFilter(change.value);
    if (status === null || (view === "pending" && status !== "")) return current;
    // 通常の条件変更と違い、同じ条件でも先頭から開き直す。
    return { ...current, [view]: { page: 1, status } };
  }
  if (change.type === "status") {
    const status = parseRequestStatusFilter(change.value);
    if (view === "pending" || status === null || status === position.status) return current;
    return { ...current, [view]: { page: 1, status } };
  }
  if (!Number.isSafeInteger(change.page) || !Number.isSafeInteger(change.lastPage)
    || change.page < 1 || change.page > change.lastPage || change.page === position.page) return current;
  return { ...current, [view]: { ...position, page: change.page } };
}
