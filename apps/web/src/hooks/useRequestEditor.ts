/** 下書き編集のReact状態とブラウザ離脱警告の寿命を持つ。通信と実際の画面移動は呼び出し元へ委ねる。 */
import { useEffect, useRef, useState } from "react";
import type { RequestDto } from "@miniflow/shared";
import { hasUnsavedRequest, resolveRequestEditor, transitionRequestEditor } from "../lib/requestEditor";
import type { RequestEditorEvent, RequestEditorState, RequestLeaveIntent } from "../lib/requestEditor";

/** sourceは編集可能な詳細だけを渡す。移動失敗は入力を残し、境界変更後の古い完了は新入力を消さない。 */
export function useRequestEditor(scope: string, source: RequestDto | null, busy: boolean, onLeave: (intent: RequestLeaveIntent) => Promise<boolean>) {
  const [state, setState] = useState<RequestEditorState | null>(null);
  const resolved = resolveRequestEditor(state, scope, source);
  const latest = useRef({ scope, source, state: resolved, busy, onLeave });
  latest.current = { scope, source, state: resolved, busy, onLeave };
  // 異なる認証境界の完了で、新しい移動ロックを解除しない。
  const leaving = useRef<{ scope: string } | null>(null);
  const dirty = hasUnsavedRequest(resolved);

  useEffect(() => {
    setState(previous => resolveRequestEditor(previous, scope, source));
  }, [scope, source?.id, source?.title, source?.body]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedRequest(latest.current.state)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const send = async (event: RequestEditorEvent) => {
    const current = latest.current;
    if (leaving.current?.scope === current.scope) return;
    const result = transitionRequestEditor(current.state, event, current.busy);
    latest.current = { ...current, state: result.state };
    setState(result.state);
    if (!result.intent) return;
    const operation = { scope: current.scope };
    leaving.current = operation;
    try {
      const success = await current.onLeave(result.intent);
      if (success && latest.current.scope === current.scope && latest.current.source?.id === current.source?.id) {
        latest.current.state = null;
        setState(null);
      }
    } finally {
      if (leaving.current === operation) leaving.current = null;
    }
  };
  // 強制初期化は確認を通さず、同じ本人の再ログインでも旧入力を参照させない。
  const reset = () => { latest.current.state = null; setState(null); };
  return { form: resolved?.form ?? { title: "", body: "" }, dirty, pending: resolved?.pending ?? null, send, reset };
}
