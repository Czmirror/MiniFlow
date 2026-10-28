/** 下書きの保存基準・入力・移動確認を扱う純粋な状態遷移。編集hookが使い、通信・保存・描画は行わない。 */
import type { RequestDto } from "@miniflow/shared";

/** 移動先はアプリ内の固定画面かログアウトだけで、URLや任意の処理は受け取らない。 */
export type RequestLeaveIntent = "dashboard" | "requests" | "mine" | "pending" | "create" | "account" | "users" | "logout";
export type RequestEditForm = { title: string; body: string };
type Source = Pick<RequestDto, "id" | "title" | "body">;
/** scopeは認証世代・本人・所属・権限を識別する。savedは表示中の保存基準で、入力と別に保持する。 */
export type RequestEditorState = { scope: string; requestId: string; saved: RequestEditForm; form: RequestEditForm; pending: RequestLeaveIntent | null };
export type RequestEditorEvent = { type: "edit"; form: RequestEditForm } | { type: "leave"; intent: RequestLeaveIntent } | { type: "cancel" } | { type: "confirm" };

/** 別申請・認証境界・保存結果では旧入力と保留操作を使わない。非編集画面はnullになる。 */
export function resolveRequestEditor(previous: RequestEditorState | null, scope: string, source: Source | null): RequestEditorState | null {
  if (!source) return null;
  if (previous?.scope === scope && previous.requestId === source.id && previous.saved.title === source.title && previous.saved.body === source.body) return previous;
  const saved = { title: source.title, body: source.body };
  return { scope, requestId: source.id, saved, form: saved, pending: null };
}

/** 保存APIの正規化と混同せず、空白・改行を含む入力どおりの差を判定する。 */
export function hasUnsavedRequest(state: RequestEditorState | null): boolean {
  return !!state && (state.form.title !== state.saved.title || state.form.body !== state.saved.body);
}

/** intentは実行してよい移動だけを返す。送信中は移動せず、確認確定では保留を先に消して再実行を防ぐ。 */
export function transitionRequestEditor(state: RequestEditorState | null, event: RequestEditorEvent, busy: boolean): { state: RequestEditorState | null; intent: RequestLeaveIntent | null } {
  if (event.type === "cancel") return { state: state ? { ...state, pending: null } : null, intent: null };
  if (event.type === "edit") return { state: state ? { ...state, form: event.form, pending: null } : null, intent: null };
  if (busy) return { state, intent: null };
  if (event.type === "leave") {
    return hasUnsavedRequest(state) && state
      ? { state: { ...state, pending: event.intent }, intent: null }
      : { state, intent: event.intent };
  }
  return { state: state ? { ...state, pending: null } : null, intent: state?.pending ?? null };
}
