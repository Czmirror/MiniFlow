"use client";

// 既存の認証・申請操作を画面に接続する。外観はglobals.cssで定義する。

import React, { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  ListRequestsResponse,
  RequestSummary,
  ApprovalDto,
  AuthUserDto,
  CreateRequestInput,
  RequestDto,
  UserRole,
  UserManagementDto
} from "@miniflow/shared";
import {
  changePassword,
  createUser,
  fetchCurrentUser,
  listUsers,
  login,
  logout,
  updateAccount,
  updateUser
} from "../lib/authApi";
import { ApiError, clearCsrfToken } from "../lib/apiTransport";
import { createRequest, getRequest, transitionRequest, updateRequest } from "../lib/requestApi";

import { RequestDetailView } from "./RequestDetailView";
export { RequestDetailView } from "./RequestDetailView";
import { StatusBadge } from "./StatusBadge";
import { formatDate, shortId } from "../lib/displayFormat";
import { RequestLeaveDialog } from "./RequestLeaveDialog";
import { canDeleteRequest } from "../lib/canDeleteRequest";
import { dashboardMetrics, resolveDashboardShortcut } from "../lib/dashboardShortcut";
import type { DashboardShortcut } from "../lib/dashboardShortcut";
import { requestStatusOptions } from "../lib/requestStatusFilter";
import type { RequestStatusFilter } from "../lib/requestStatusFilter";
import { messages } from "../lib/messages";
import type { Labels, Locale } from "../lib/messages";
import { currentRequestDetail } from "../lib/currentRequestDetail";
import { managedUserChange } from "../lib/managedUserChange";
import { useRequestCollection } from "../hooks/useRequestCollection";
import { useRequestEditor } from "../hooks/useRequestEditor";
import type { RequestEditForm, RequestLeaveIntent } from "../lib/requestEditor";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const defaultTeamId = "team-1";

type View = Exclude<RequestLeaveIntent, "logout"> | "detail";

const initialCreateForm: CreateRequestInput = {
  teamId: defaultTeamId,
  title: "",
  body: ""
};

const initialUserForm = {
  email: "",
  password: "",
  displayName: "",
  language: "ja" as Locale,
  teamId: defaultTeamId,
  role: "Applicant" as UserRole
};

const initialPasswordForm = {
  currentPassword: "",
  newPassword: ""
};

export function MiniFlowApp() {
  // logout/401後に遅い管理更新の応答が本人情報を復帰させないための世代。
  const sessionEpoch = useRef(0);
  // 詳細取得の世代。所属・認証の変更と新しい詳細取得で以前の応答を破棄する。
  const detailEpoch = useRef(0);
  // 申請の更新を再描画前から排他にし、送信途中の画面移動も防ぐ。
  // 境界変更で無効化し、旧操作のfinallyは所有tokenが一致するときだけ解除する。
  const requestInFlight = useRef<{ session: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserDto | null>(null);
  const [locale, setLocale] = useState<Locale>("ja");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password1234");
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [users, setUsers] = useState<UserManagementDto[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalDto[]>([]);
  const [detailReturnView, setDetailReturnView] = useState<"requests" | "mine" | "pending">("requests");
  const [view, setView] = useState<View>("dashboard");
  const [createForm, setCreateForm] = useState<CreateRequestInput>(initialCreateForm);
  const [accountForm, setAccountForm] = useState({ displayName: "", language: "ja" as Locale });
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [decisionReason, setDecisionReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const labels = messages[locale];
  const navItems: Array<{ view: Exclude<View, "detail">; label: string }> = [
    { view: "dashboard", label: labels.dashboard },
    { view: "requests", label: labels.requestList },
    { view: "mine", label: labels.myRequests },
    { view: "pending", label: labels.pendingApprovals },
    { view: "create", label: labels.requestCreate },
    { view: "account", label: labels.accountSettings },
    ...(currentUser?.role === "Admin" ? [{ view: "users" as const, label: labels.userManagement }] : [])
  ];
  const currentPageTitle =
    view === "detail"
      ? labels.requestDetail
      : navItems.find((item) => item.view === view)?.label ?? labels.dashboard;

  useEffect(() => {
    void initialize();
  }, []);

  const collection = useRequestCollection(apiBaseUrl, currentUser, view, handleApiError);
  const editableRequest = view === "detail" && selectedRequest?.status === "Draft" && currentUser
    && (selectedRequest.createdBy === currentUser.id || currentUser.role === "Admin") ? selectedRequest : null;
  const editorScope = JSON.stringify([sessionEpoch.current, currentUser?.id, currentUser?.teamId, currentUser?.role]);
  const editor = useRequestEditor(editorScope, editableRequest, view === "detail" && loading, async intent => {
    if (view === "detail" && (loading || requestInFlight.current?.session === sessionEpoch.current)) return false;
    if (intent === "logout") return handleLogout();
    detailEpoch.current++;
    setDetailLoading(false);
    setDetailFailed(false);
    setView(intent);
    return true;
  });
  const latestRequestScreen = useRef({ view, reload: collection.reload });
  latestRequestScreen.current = { view, reload: collection.reload };

  // サーバーが認証を拒否した場合も、再読込なしで再ログインできる状態へ戻す。
  function clearSession() {
    sessionEpoch.current++;
    detailEpoch.current++;
    requestInFlight.current = null;
    clearCsrfToken();
    setCurrentUser(null);
    setPassword("");
    collection.reset();
    editor.reset();
    setUsers([]);
    setSelectedRequest(null);
    setDetailLoading(false);
    setDetailFailed(false);
    setDetailId(null);
    setApprovals([]);
    setView("dashboard");
    setTeamId(defaultTeamId);
    setCreateForm(initialCreateForm);
    setAccountForm({ displayName: "", language: "ja" });
    setPasswordForm(initialPasswordForm);
    setUserForm(initialUserForm);
    setDecisionReason("");
    setMessage(null);
    setLoading(false);
  }

  function handleApiError(caughtError: unknown) {
    if (caughtError instanceof ApiError && caughtError.status === 401) clearSession();
    setError(caughtError instanceof ApiError && caughtError.status === 409
      ? (locale === "ja" ? "更新が競合しました。最新の内容を再取得してから操作してください。" : "The request changed. Reload the latest data before trying again.")
      : toErrorMessage(caughtError));
  }

  async function initialize() {
    setLoading(true);
    setError(null);

    try {
      const user = await fetchCurrentUser(apiBaseUrl);
      setCurrentUser(user);
      if (user) {
        applyUserSettings(user);
        if (user.role === "Admin") {
          await refreshUsers();
        }
      }
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const user = await login(apiBaseUrl, { email, password });
      setCurrentUser(user);
      applyUserSettings(user);
      if (user.role === "Admin") {
        await refreshUsers();
      }
      setView("dashboard");
      setMessage(labels.loginSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const epoch = sessionEpoch.current;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await logout(apiBaseUrl);
      if (epoch !== sessionEpoch.current) return false;
      clearSession();
      return true;
    } catch (caughtError) {
      if (epoch === sessionEpoch.current) handleApiError(caughtError);
      return false;
    } finally {
      if (epoch === sessionEpoch.current) setLoading(false);
    }
  }

  async function refreshRequests() {
    await collection.reload();
  }

  async function refreshUsers() {
    const response = await listUsers(apiBaseUrl);
    setUsers(response.items);
  }

  async function handleCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createFromForm(false);
  }

  async function handleCreateAndSubmit() {
    await createFromForm(true);
  }

  async function createFromForm(submitAfterCreate: boolean) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createRequest(apiBaseUrl, {
        teamId,
        title: createForm.title.trim(),
        body: createForm.body.trim()
      });
      const nextRequest = submitAfterCreate
        ? await transitionRequest(apiBaseUrl, created.id, "submit")
        : created;
      await refreshRequests();
      setDetailReturnView("requests");
      await openDetail(nextRequest.id);
      setTeamId(created.teamId);
      setCreateForm({ ...initialCreateForm, teamId: created.teamId });
      setMessage(submitAfterCreate ? labels.submitSuccess : labels.createSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: string) {
    const epoch = ++detailEpoch.current;
    const detail = await currentRequestDetail(() => getRequest(apiBaseUrl, id), () => epoch === detailEpoch.current);
    if (!detail) return false;
    setDetailId(id);
    setSelectedRequest(detail.request);
    setApprovals(detail.approvals);
    setDecisionReason("");
    setView("detail");
    return true;
  }

  async function handleOpenDetail(id: string) {
    if (view !== "detail") setDetailReturnView(view === "mine" || view === "pending" ? view : "requests");
    const epoch = detailEpoch.current + 1;
    setDetailId(id);
    setSelectedRequest(null);
    setApprovals([]);
    setView("detail");
    setDetailLoading(true);
    setDetailFailed(false);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await openDetail(id);
    } catch (caughtError) {
      if (epoch === detailEpoch.current) { setDetailFailed(true); handleApiError(caughtError); }
    } finally {
      if (epoch === detailEpoch.current) { setLoading(false); setDetailLoading(false); }
    }
  }

  async function handleDeleteRequest() {
    if (!selectedRequest || !canDeleteRequest(selectedRequest, currentUser) || loading || requestInFlight.current?.session === sessionEpoch.current) return;
    const operation = { session: sessionEpoch.current };
    requestInFlight.current = operation;
    const epoch = detailEpoch.current;
    const session = sessionEpoch.current;
    const isCurrent = () => epoch === detailEpoch.current && session === sessionEpoch.current;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await transitionRequest(apiBaseUrl, selectedRequest.id, "delete");
      if (!isCurrent()) return;
      // 同時に進んでいた古い詳細GETも無効にし、削除後の詳細を復帰させない。
      detailEpoch.current++;
      setSelectedRequest(null);
      setApprovals([]);
      setDecisionReason("");
      editor.reset();
      setMessage(labels.deleteSuccess);
      setLoading(false);
      if (latestRequestScreen.current.view === "detail") setView(detailReturnView);
      else await latestRequestScreen.current.reload();
    } catch (caughtError) {
      if (isCurrent()) handleApiError(caughtError);
    } finally {
      if (requestInFlight.current === operation) requestInFlight.current = null;
      if (isCurrent()) setLoading(false);
    }
  }

  // API更新から詳細の再取得まで同じ操作として扱う。世代をまたぐ完了は入力や新画面へ適用しない。
  async function changeSelectedRequest(change: (request: RequestDto, isCurrent: () => boolean) => Promise<RequestDto | null>, successMessage: string) {
    if (!selectedRequest || loading || requestInFlight.current?.session === sessionEpoch.current) return;
    const operation = { session: sessionEpoch.current };
    requestInFlight.current = operation;
    let epoch = detailEpoch.current;
    const session = sessionEpoch.current;
    const isCurrent = () => epoch === detailEpoch.current && session === sessionEpoch.current;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const changed = await change(selectedRequest, isCurrent);
      if (!changed || !isCurrent()) return;
      await refreshRequests();
      if (!isCurrent()) return;
      // openDetailが開始する次の取得世代を、この操作の完了判定でも追跡する。
      epoch = detailEpoch.current + 1;
      if (await openDetail(changed.id) && isCurrent()) {
        editor.reset();
        setMessage(successMessage);
      }
    } catch (caughtError) {
      if (isCurrent()) handleApiError(caughtError);
    } finally {
      if (requestInFlight.current === operation) requestInFlight.current = null;
      if (isCurrent()) setLoading(false);
    }
  }

  async function handleDecision(action: "approve" | "reject") {
    await changeSelectedRequest(request => transitionRequest(apiBaseUrl, request.id, action,
      decisionReason.trim() ? { reason: decisionReason.trim() } : undefined), action === "approve" ? labels.approveSuccess : labels.rejectSuccess);
  }

  async function handleSubmitRequest(input?: RequestEditForm) {
    await changeSelectedRequest(async (request, isCurrent) => {
      const toSubmit = input ? await updateRequest(apiBaseUrl, request.id, input) : request;
      return isCurrent() ? transitionRequest(apiBaseUrl, toSubmit.id, "submit") : null;
    }, labels.submitSuccess);
  }

  async function handleReviseRequest() {
    await changeSelectedRequest(request => transitionRequest(apiBaseUrl, request.id, "revise"), labels.reviseSuccess);
  }

  async function handleUpdateSelectedRequest(input: RequestEditForm) {
    await changeSelectedRequest(request => updateRequest(apiBaseUrl, request.id, input), labels.updateSuccess);
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const user = await updateAccount(apiBaseUrl, {
        displayName: accountForm.displayName,
        language: accountForm.language
      });
      setCurrentUser(user);
      applyUserSettings(user);
      setMessage(messages[user.language].accountUpdated);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await changePassword(apiBaseUrl, passwordForm);
      clearSession();
      setMessage(labels.passwordChanged);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUserCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await createUser(apiBaseUrl, {
        email: userForm.email,
        password: userForm.password,
        displayName: userForm.displayName,
        language: userForm.language,
        teamId: userForm.teamId,
        role: userForm.role
      });
      setUserForm({ ...initialUserForm, teamId });
      await refreshUsers();
      setMessage(labels.userCreated);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUserUpdate(
    user: UserManagementDto,
    input: { displayName?: string | null; language?: Locale; teamId?: string; role?: UserRole; isActive?: boolean }
  ) {
    if (!currentUser) return false;
    const epoch = sessionEpoch.current;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateUser(apiBaseUrl, user.id, {
        displayName: user.displayName,
        language: user.language,
        teamId: user.teamId,
        role: user.role,
        ...input
      });
      if (epoch !== sessionEpoch.current) return false;
      const change = managedUserChange(currentUser, updated);
      if (change !== "other") {
        if (!updated.isActive) { clearSession(); return true; }
        if (change === "context") {
          detailEpoch.current++;
          requestInFlight.current = null;
          collection.reset();
          editor.reset();
          setSelectedRequest(null);
          setDetailLoading(false);
          setDetailFailed(false);
          setDetailId(null);
          setApprovals([]);
          setDecisionReason("");
          setCreateForm({ ...initialCreateForm, teamId: updated.teamId });
          setPasswordForm(initialPasswordForm);
          setUserForm({ ...initialUserForm, teamId: updated.teamId });
          setUsers([]);
          setView("dashboard");
        }
        setCurrentUser(updated);
        applyUserSettings(updated);
        setMessage(change === "context" ? messages[updated.language].contextChanged : messages[updated.language].userUpdated);
      } else {
        setMessage(messages[currentUser.language].userUpdated);
      }
      if (change !== "context" || updated.role === "Admin") await refreshUsers();
      return true;
    } catch (caughtError) {
      if (epoch === sessionEpoch.current) handleApiError(caughtError);
      return false;
    } finally {
      if (epoch === sessionEpoch.current) setLoading(false);
    }
  }

  function applyUserSettings(user: AuthUserDto) {
    setLocale(user.language);
    setAccountForm({
      displayName: user.displayName ?? "",
      language: user.language
    });
    setTeamId(user.teamId);
    setCreateForm((current) => ({ ...current, teamId: user.teamId }));
    setUserForm((current) => ({ ...current, teamId: user.teamId }));
  }

  if (!currentUser) {
    return (
      <main className="login-screen">
        <section className="login-panel" aria-labelledby="login-title">
          <div>
            <p className="eyebrow">MiniFlow</p>
            <h1 id="login-title">{labels.login}</h1>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            <label className="field">
              <span>{labels.email}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            <label className="field">
              <span>{labels.password}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? labels.loggingIn : labels.login}
            </button>
          </form>

          <StatusMessage error={error} message={message} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">MiniFlow</p>
          <h1>{currentPageTitle}</h1>
        </div>

        <nav className="nav-list" aria-label="主要ナビゲーション">
          {navItems.map((item) => (
            <button
              className={view === item.view ? "nav-item active" : "nav-item"}
              key={item.view}
              aria-current={view === item.view ? "page" : undefined}
              type="button"
              disabled={view === "detail" && loading}
              onClick={() => { if (item.view !== view) void editor.send({ type: "leave", intent: item.view }); }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-block">
            <span>{currentUser.email}</span>
            <span>{roleLabel(currentUser.role, labels)}</span>
            <small>{currentUser.id}</small>
          </div>
          <button className="button quiet" type="button" onClick={() => void editor.send({ type: "leave", intent: "logout" })} disabled={loading}>
            {labels.logout}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <StatusMessage error={error} message={message} />

        {view === "dashboard" && !collection.data ? (
          <section className="empty-state" aria-live="polite">
            <p>{collection.error ?? labels.loadingRequests}</p>
            {collection.error ? <button className="button secondary" type="button" onClick={() => void collection.reload()}>{labels.reload}</button> : null}
          </section>
        ) : null}

        {view === "dashboard" && collection.data ? (
          <Dashboard labels={labels} stats={collection.data.summary} pendingApprovals={collection.data.listing.items} onOpenDetail={handleOpenDetail}
            onOpenList={shortcut => {
              const destination = resolveDashboardShortcut(shortcut);
              if (!destination) return;
              collection.openList(destination.view, destination.status);
              setView(destination.view);
            }} />
        ) : null}

        {["requests", "mine", "pending"].includes(view) ? (
          <RequestList labels={labels} loading={collection.loading} error={collection.error} onReload={collection.reload}
            title={currentPageTitle} listing={collection.data?.listing ?? null} onPage={collection.changePage} onOpenDetail={handleOpenDetail}
            statusFilter={collection.statusFilter} onStatusChange={view === "pending" ? undefined : collection.changeStatus} />
        ) : null}

        {view === "create" ? (
          <CreateRequestView
            labels={labels}
            form={createForm}
            loading={loading}
            onChange={setCreateForm}
            onSaveDraft={handleCreateDraft}
            onSubmitRequest={handleCreateAndSubmit}
          />
        ) : null}

        {view === "account" ? (
          <AccountSettingsView
            labels={labels}
            accountForm={accountForm}
            loading={loading}
            passwordForm={passwordForm}
            onAccountChange={setAccountForm}
            onAccountSubmit={handleAccountSubmit}
            onPasswordChange={setPasswordForm}
            onPasswordSubmit={handlePasswordSubmit}
          />
        ) : null}

        {view === "users" && currentUser.role === "Admin" ? (
          <UserManagementView
            labels={labels}
            currentUser={currentUser}
            form={userForm}
            loading={loading}
            users={users}
            onCreate={handleUserCreate}
            onFormChange={setUserForm}
            onUpdate={handleUserUpdate}
          />
        ) : null}

        {view === "detail" ? (
          <RequestDetailView
            labels={labels}
            approvals={approvals}
            currentUser={currentUser}
            decisionReason={decisionReason}
            loading={loading}
            request={selectedRequest}
            detailLoading={detailLoading}
            detailFailed={detailFailed}
            onRetry={() => { if (detailId) void handleOpenDetail(detailId); }}
            editForm={editor.form}
            onEditChange={form => void editor.send({ type: "edit", form })}
            onBack={() => void editor.send({ type: "leave", intent: detailReturnView })}
            onDelete={handleDeleteRequest}
            onDecision={handleDecision}
            onDecisionReasonChange={setDecisionReason}
            onReviseRequest={handleReviseRequest}
            onSubmitRequest={handleSubmitRequest}
            onUpdateRequest={handleUpdateSelectedRequest}
          />
        ) : null}
      </section>
      {editor.pending ? <RequestLeaveDialog labels={labels} logout={editor.pending === "logout"} disabled={loading}
        onCancel={() => void editor.send({ type: "cancel" })} onConfirm={() => void editor.send({ type: "confirm" })} /> : null}
    </main>
  );
}

/** 渡された文言と集計でダッシュボードを表示する。一覧への固定操作は親へ返し、取得状態は持たない。 */
export function Dashboard({
  labels,
  stats,
  pendingApprovals,
  onOpenDetail,
  onOpenList
}: {
  labels: Labels;
  stats: RequestSummary;
  pendingApprovals: RequestDto[];
  onOpenDetail: (id: string) => void;
  onOpenList: (shortcut: DashboardShortcut) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div>
          <p className="eyebrow">{labels.overview}</p>
          <h2>{labels.dashboard}</h2>
        </div>
      </section>

      <div className="metric-grid">
        {dashboardMetrics.map(key => <Metric key={key} label={key === "mine" ? labels.myRequests : key === "drafts" ? labels.draft : labels[key]} value={stats[key]}
          hint={labels.metricActions[key]} onOpen={() => onOpenList(key)} />)}
      </div>

      <section>
        <div className="section-heading">
          <div><h3>{labels.pendingApprovals}</h3><p className="muted">{labels.pendingApprovalsHint}</p></div>
          <button className="button secondary" type="button" onClick={() => onOpenList("pendingApprovals")}>{labels.viewAll}</button>
        </div>
        <RequestTable labels={labels} requests={pendingApprovals.slice(0, 5)} onOpenDetail={onOpenDetail} emptyText={labels.noPendingApprovals} />
      </section>
    </div>
  );
}

function Metric({ label, value, hint, onOpen }: { label: string; value: number; hint: string; onOpen: () => void }) {
  return (
    <button className="metric" type="button" onClick={onOpen}>
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="metric-action">{hint} <span aria-hidden="true">→</span></span>
    </button>
  );
}

/** 一覧の状態条件と取得結果を表示する。条件・通信の寿命は親の取得hookが所有する。 */
export function RequestList({ labels, title, listing, loading, error, onReload, statusFilter, onStatusChange, onPage, onOpenDetail }: {
  labels: Labels;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  title: string;
  listing: ListRequestsResponse | null;
  statusFilter: RequestStatusFilter;
  onStatusChange?: (value: string) => void;
  onPage: (page: number) => void;
  onOpenDetail: (id: string) => void;
}) {
  const pages = listing ? Math.max(1, Math.ceil(listing.total / listing.limit)) : 1;
  const start = !listing || listing.total === 0 ? 0 : (listing.page - 1) * listing.limit + 1;
  const end = !listing || start === 0 ? 0 : start + listing.items.length - 1;
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div><p className="eyebrow">{labels.requests}</p><h2>{title}</h2></div>
        {onStatusChange ? <label className="field request-status-filter">
          <span>{labels.status}</span>
          <select value={statusFilter} onChange={event => onStatusChange(event.target.value)}>
            <option value="">{labels.allStatuses}</option>
            {requestStatusOptions.map(status => <option key={status} value={status}>{labels.statusLabels[status]}</option>)}
          </select>
        </label> : null}
      </section>
      {error ? <section className="empty-state" role="alert"><p>{error}</p><button className="button secondary" type="button" onClick={onReload}>{labels.reload}</button></section> : null}
      {!listing && !error ? <p className="empty-state" aria-live="polite">{labels.loadingRequests}</p> : null}
      {listing ? <>
        <RequestTable labels={labels} disabled={loading} requests={listing.items} onOpenDetail={onOpenDetail} emptyText={statusFilter ? labels.noMatchingRequests : labels.noRequests} />
        <nav className="pagination" aria-busy={loading} aria-label={`${title} pagination`}>
          <p aria-live="polite">{loading ? labels.loadingRequests : null} {start}–{end} / {listing.total} · {listing.page} / {pages}</p>
          <div className="form-actions">
            <button className="button secondary" type="button" disabled={loading || listing.page <= 1} onClick={() => onPage(listing.page - 1)}>{labels.previousPage}</button>
            <button className="button secondary" type="button" disabled={loading || listing.page >= pages} onClick={() => onPage(listing.page + 1)}>{labels.nextPage}</button>
          </div>
        </nav>
      </> : null}
    </div>
  );
}

function RequestTable({
  labels,
  disabled = false,
  requests,
  emptyText,
  onOpenDetail
}: {
  labels: Labels;
  requests: RequestDto[];
  emptyText: string;
  disabled?: boolean;
  onOpenDetail: (id: string) => void;
}) {
  if (requests.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="table-wrap" role="region" aria-label={labels.requestList} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>{labels.title}</th>
            <th>{labels.status}</th>
            <th>{labels.requester}</th>
            <th>{labels.updated}</th>
            <th aria-label={labels.detail} />
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>
                <strong>{request.title}</strong>
                <small>{request.id}</small>
              </td>
              <td>
                <StatusBadge labels={labels} status={request.status} />
              </td>
              <td>{shortId(request.createdBy)}</td>
              <td>{formatDate(request.updatedAt)}</td>
              <td>
                <button className="button table-action" type="button" disabled={disabled} onClick={() => void onOpenDetail(request.id)}>
                  {labels.detail}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateRequestView({
  labels,
  form,
  loading,
  onChange,
  onSaveDraft,
  onSubmitRequest
}: {
  labels: Labels;
  form: CreateRequestInput;
  loading: boolean;
  onChange: (form: CreateRequestInput) => void;
  onSaveDraft: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRequest: (input?: { title: string; body: string }) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div>
          <p className="eyebrow">{labels.requests}</p>
          <h2>{labels.requestCreate}</h2>
        </div>
      </section>

      <form className="form-panel" onSubmit={onSaveDraft}>
        <div className="field readonly-field">
          <span>{labels.team}</span>
          <strong>{form.teamId}</strong>
        </div>
        <label className="field">
          <span>{labels.title}</span>
          <input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
        </label>
        <label className="field">
          <span>{labels.body}</span>
          <textarea rows={8} value={form.body} onChange={(event) => onChange({ ...form, body: event.target.value })} />
        </label>
        <div className="form-actions">
          <button className="button secondary" type="submit" disabled={loading}>
            {loading ? labels.savingDraft : labels.saveDraft}
          </button>
          <button className="button primary" type="button" disabled={loading} onClick={() => void onSubmitRequest()}>
            {loading ? labels.submittingRequest : labels.submitRequest}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountSettingsView({
  labels,
  accountForm,
  loading,
  passwordForm,
  onAccountChange,
  onAccountSubmit,
  onPasswordChange,
  onPasswordSubmit
}: {
  labels: Labels;
  accountForm: { displayName: string; language: Locale };
  loading: boolean;
  passwordForm: { currentPassword: string; newPassword: string };
  onAccountChange: (form: { displayName: string; language: Locale }) => void;
  onAccountSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (form: { currentPassword: string; newPassword: string }) => void;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div>
          <p className="eyebrow">{labels.accountSettings}</p>
          <h2>{labels.accountSettings}</h2>
        </div>
      </section>

      <div className="settings-grid">
        <form className="form-panel" onSubmit={onAccountSubmit}>
          <label className="field">
            <span>{labels.displayName}</span>
            <input
              value={accountForm.displayName}
              onChange={(event) => onAccountChange({ ...accountForm, displayName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{labels.language}</span>
            <select
              value={accountForm.language}
              onChange={(event) => onAccountChange({ ...accountForm, language: event.target.value as Locale })}
            >
              <option value="ja">{labels.japanese}</option>
              <option value="en">{labels.english}</option>
            </select>
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? labels.saving : labels.save}
          </button>
        </form>

        <form className="form-panel" onSubmit={onPasswordSubmit}>
          <h3>{labels.passwordChange}</h3>
          <label className="field">
            <span>{labels.currentPassword}</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => onPasswordChange({ ...passwordForm, currentPassword: event.target.value })}
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            <span>{labels.newPassword}</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => onPasswordChange({ ...passwordForm, newPassword: event.target.value })}
              autoComplete="new-password"
            />
          </label>
          <button className="button secondary" type="submit" disabled={loading}>
            {labels.changePassword}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserManagementView({
  labels,
  currentUser,
  form,
  loading,
  users,
  onCreate,
  onFormChange,
  onUpdate
}: {
  labels: Labels;
  currentUser: AuthUserDto;
  form: typeof initialUserForm;
  loading: boolean;
  users: UserManagementDto[];
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: typeof initialUserForm) => void;
  onUpdate: (
    user: UserManagementDto,
    input: { displayName?: string | null; language?: Locale; teamId?: string; role?: UserRole; isActive?: boolean }
  ) => Promise<boolean>;
}) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    language: "ja" as Locale,
    teamId: defaultTeamId,
    role: "Applicant" as UserRole
  });

  function startEdit(user: UserManagementDto) {
    setEditingUserId(user.id);
    setEditForm({
      displayName: user.displayName ?? "",
      language: user.language,
      teamId: user.teamId,
      role: user.role
    });
  }

  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div>
          <p className="eyebrow">{labels.userManagement}</p>
          <h2>{labels.userManagement}</h2>
        </div>
      </section>

      <form className="form-panel" onSubmit={onCreate}>
        <h3>{labels.createUser}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{labels.email}</span>
            <input value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} />
          </label>
          <label className="field">
            <span>{labels.password}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => onFormChange({ ...form, password: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{labels.displayName}</span>
            <input
              value={form.displayName}
              onChange={(event) => onFormChange({ ...form, displayName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{labels.team}</span>
            <input value={form.teamId} onChange={(event) => onFormChange({ ...form, teamId: event.target.value })} />
          </label>
          <label className="field">
            <span>{labels.language}</span>
            <select
              value={form.language}
              onChange={(event) => onFormChange({ ...form, language: event.target.value as Locale })}
            >
              <option value="ja">{labels.japanese}</option>
              <option value="en">{labels.english}</option>
            </select>
          </label>
          <label className="field">
            <span>{labels.role}</span>
            <select
              value={form.role}
              onChange={(event) => onFormChange({ ...form, role: event.target.value as UserRole })}
            >
              <option value="Applicant">{labels.applicant}</option>
              <option value="Approver">{labels.approver}</option>
              <option value="Admin">{labels.admin}</option>
            </select>
          </label>
        </div>
        <button className="button primary" type="submit" disabled={loading}>
          {labels.createUser}
        </button>
      </form>

      <div className="table-wrap user-table" role="region" aria-label={labels.userManagement} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{labels.email}</th>
              <th>{labels.displayName}</th>
              <th>{labels.team}</th>
              <th>{labels.role}</th>
              <th>{labels.language}</th>
              <th>{labels.status}</th>
              <th aria-label={labels.editUser} />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.email}</strong>
                  <small>{user.id}</small>
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <input
                      value={editForm.displayName}
                      onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })}
                    />
                  ) : (
                    user.displayName || "-"
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <input value={editForm.teamId} onChange={(event) => setEditForm({ ...editForm, teamId: event.target.value })} />
                  ) : (
                    user.teamId
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <select
                      value={editForm.role}
                      onChange={(event) => setEditForm({ ...editForm, role: event.target.value as UserRole })}
                    >
                      <option value="Applicant">{labels.applicant}</option>
                      <option value="Approver">{labels.approver}</option>
                      <option value="Admin">{labels.admin}</option>
                    </select>
                  ) : (
                    roleLabel(user.role, labels)
                  )}
                </td>
                <td>
                  {editingUserId === user.id ? (
                    <select
                      value={editForm.language}
                      onChange={(event) => setEditForm({ ...editForm, language: event.target.value as Locale })}
                    >
                      <option value="ja">{labels.japanese}</option>
                      <option value="en">{labels.english}</option>
                    </select>
                  ) : user.language === "ja" ? (
                    labels.japanese
                  ) : (
                    labels.english
                  )}
                </td>
                <td>{user.isActive ? labels.active : labels.inactive}</td>
                <td>
                  {editingUserId === user.id ? (
                    <button
                      className="button table-action"
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        if (await onUpdate(user, editForm)) setEditingUserId(null);
                      }}
                    >
                      {labels.save}
                    </button>
                  ) : (
                    <button className="button table-action" type="button" disabled={loading} onClick={() => startEdit(user)}>
                      {labels.editUser}
                    </button>
                  )}
                  <button
                    className="button table-action secondary-action"
                    type="button"
                    disabled={loading || user.id === currentUser.id}
                    onClick={() => void onUpdate(user, { isActive: !user.isActive })}
                  >
                    {user.isActive ? labels.disableUser : labels.enableUser}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusMessage({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return <p className={error ? "notice error" : "notice success"}>{error ?? message}</p>;
}

function roleLabel(role: UserRole, labels: Labels) {
  if (role === "Admin") {
    return labels.admin;
  }
  if (role === "Approver") {
    return labels.approver;
  }

  return labels.applicant;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
