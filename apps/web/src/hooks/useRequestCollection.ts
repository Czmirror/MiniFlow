/** 認証と選択画面に対応する申請データの寿命を管理する。描画と業務判断は持たない。 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUserDto, RequestListScope } from "@miniflow/shared";
import { parseRequestStatusFilter } from "../lib/requestStatusFilter";
import type { RequestStatusFilter } from "../lib/requestStatusFilter";
import { ApiError } from "../lib/apiTransport";
import { loadRequestCollection } from "../lib/requestCollection";

type Data = NonNullable<Awaited<ReturnType<typeof loadRequestCollection>>>;

/** user/team/role・画面・状態条件が変わるとページと旧応答を破棄する。失敗した結果を0件に置き換えない。 */
export function useRequestCollection(baseUrl: string, user: AuthUserDto | null, view: string, onUnauthorized: (error: unknown) => void) {
  const identity = user ? JSON.stringify([user.id, user.teamId, user.role]) : "";
  // 条件は一覧別にログイン中だけ保持し、本人の認証・所属境界が変われば読み捨てる。
  const [filters, setFilters] = useState<{ identity: string; requests: RequestStatusFilter; mine: RequestStatusFilter }>({ identity, requests: "", mine: "" });
  const statusFilter = filters.identity === identity && (view === "requests" || view === "mine") ? filters[view] : "";
  const context = user ? JSON.stringify([identity, view, statusFilter]) : "";
  const generation = useRef(0);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const [selection, setSelection] = useState({ context, page: 1 });
  const page = selection.context === context ? selection.page : 1;
  const key = `${context}:${page}`;
  const current = useRef(key);
  current.current = key;
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
        setState({ context: key, owner: context, data, error: null, loading: false });
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof ApiError && error.status === 401) unauthorized.current(error);
      setState({ context: key, owner: context, data: null, error: error instanceof Error ? error.message : "Failed to load requests", loading: false });
    }
  }, [active, baseUrl, context, key, page, scope, view, statusFilter]);

  useEffect(() => { setSelection({ context, page: 1 }); }, [context]);
  useEffect(() => { void reload(); return () => { generation.current++; }; }, [reload]);
  const reset = () => { setFilters({ identity: "", requests: "", mine: "" }); generation.current++; setState({ context: "", owner: "", data: null, error: null, loading: false }); };
  const visible = state.owner === context ? { ...state, loading: state.loading || state.context !== key } : { data: null, error: null, loading: active };
  const changePage = (next: number) => {
    const last = Math.max(1, Math.ceil((visible.data?.listing.total ?? 0) / (visible.data?.listing.limit ?? 20)));
    if (!visible.loading && Number.isInteger(next) && next >= 1 && next <= last) setSelection({ context, page: next });
  };
  const changeStatus = (value: string) => {
    const next = parseRequestStatusFilter(value);
    if (next === null || (view !== "requests" && view !== "mine")) return;
    setFilters(previous => ({
      identity,
      requests: previous.identity === identity ? previous.requests : "",
      mine: previous.identity === identity ? previous.mine : "",
      [view]: next
    }));
  };
  return { ...visible, reload, reset, changePage, statusFilter, changeStatus };
}
