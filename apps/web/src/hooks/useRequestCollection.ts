/** 認証と選択画面に対応する申請データの寿命を管理する。描画と業務判断は持たない。 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUserDto, RequestListScope } from "@miniflow/shared";
import { changeRequestListSelection, createRequestListSelection, readRequestListSelection } from "../lib/requestListSelection";
import { ApiError } from "../lib/apiTransport";
import { loadRequestCollection } from "../lib/requestCollection";

type Data = NonNullable<Awaited<ReturnType<typeof loadRequestCollection>>>;

/** 一覧別の位置を認証境界内で保持し、画面・条件・ページ変更前の応答は破棄する。失敗を0件に置き換えない。 */
export function useRequestCollection(baseUrl: string, user: AuthUserDto | null, view: string, onUnauthorized: (error: unknown) => void) {
  const identity = user ? JSON.stringify([user.id, user.teamId, user.role]) : "";
  const [selection, setSelection] = useState(() => createRequestListSelection(identity));
  const { page, status: statusFilter } = readRequestListSelection(selection, identity, view);
  const context = user ? JSON.stringify([identity, view, statusFilter]) : "";
  const generation = useRef(0);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const key = `${context}:${page}`;
  const current = useRef(key);
  current.current = key;
  // 補正結果に合わせて位置を更新した直後だけ、同じ成功データの再取得を省く。
  // 次の画面移動・再試行では再利用せず、通常どおり取得する。
  const correctedKey = useRef<string | null>(null);
  const [state, setState] = useState<{ context: string; owner: string; data: Data | null; error: string | null; loading: boolean }>({ context: "", owner: "", data: null, error: null, loading: false });
  const scope: RequestListScope = view === "mine" ? "mine" : view === "pending" || view === "dashboard" ? "pendingApprovals" : "all";
  const active = !!user && ["dashboard", "requests", "mine", "pending"].includes(view);

  const reload = useCallback(async () => {
    const requestGeneration = ++generation.current;
    if (!active) return;
    const isCurrent = () => generation.current === requestGeneration && current.current === key;
    setState(previous => ({ context: key, owner: context, data: previous.owner === context ? previous.data : null, error: null, loading: true }));
    try {
      const data = await loadRequestCollection(baseUrl, scope, page, view === "dashboard", isCurrent, statusFilter || undefined);
      if (data && isCurrent()) {
        const resultKey = `${context}:${data.listing.page}`;
        if (data.listing.page !== page) {
          correctedKey.current = resultKey;
          setSelection(previous => changeRequestListSelection(previous, identity, view, {
            type: "page", page: data.listing.page, lastPage: Math.max(1, Math.ceil(data.listing.total / data.listing.limit))
          }));
        }
        setState({ context: resultKey, owner: context, data, error: null, loading: false });
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.status === 401) unauthorized.current(error);
      setState({ context: key, owner: context, data: null, error: error instanceof Error ? error.message : "Failed to load requests", loading: false });
    }
  }, [active, baseUrl, context, key, page, scope, view, statusFilter, identity]);

  useEffect(() => { setSelection(previous => previous.identity === identity ? previous : createRequestListSelection(identity)); }, [identity]);
  useEffect(() => {
    const alreadyLoaded = correctedKey.current === key;
    correctedKey.current = null;
    if (!alreadyLoaded) void reload();
    return () => { generation.current++; };
  }, [reload, key]);
  const reset = () => { setSelection(createRequestListSelection("")); correctedKey.current = null; generation.current++; setState({ context: "", owner: "", data: null, error: null, loading: false }); };
  const visible = state.owner === context ? { ...state, loading: state.loading || state.context !== key } : { data: null, error: null, loading: active };
  const changePage = (next: number) => {
    const last = Math.max(1, Math.ceil((visible.data?.listing.total ?? 0) / (visible.data?.listing.limit ?? 20)));
    if (!visible.loading) setSelection(previous => changeRequestListSelection(previous, identity, view, { type: "page", page: next, lastPage: last }));
  };
  const changeStatus = (value: string) => {
    setSelection(previous => changeRequestListSelection(previous, identity, view, { type: "status", value }));
  };
  // ダッシュボードから開く一覧だけを更新する。viewの切替は呼び出し元が同じ操作内で行う。
  const openList = (target: string, status: string) => {
    setSelection(previous => changeRequestListSelection(previous, identity, target, { type: "open", value: status }));
  };
  return { ...visible, reload, reset, changePage, statusFilter, changeStatus, openList };
}
