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

import { messages } from "../lib/messages";
import type { Labels, Locale } from "../lib/messages";
import { currentRequestDetail } from "../lib/currentRequestDetail";
import { managedUserChange } from "../lib/managedUserChange";
import { useRequestCollection } from "../hooks/useRequestCollection";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const defaultTeamId = "team-1";

type View = "dashboard" | "requests" | "mine" | "pending" | "create" | "detail" | "account" | "users";

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
  const [currentUser, setCurrentUser] = useState<AuthUserDto | null>(null);
  const [locale, setLocale] = useState<Locale>("ja");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password1234");
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [users, setUsers] = useState<UserManagementDto[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [approvals, setApprovals] = useState<ApprovalDto[]>([]);
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
  const navItems: Array<{ view: View; label: string }> = [
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

  // サーバーが認証を拒否した場合も、再読込なしで再ログインできる状態へ戻す。
  function clearSession() {
    sessionEpoch.current++;
    detailEpoch.current++;
    clearCsrfToken();
    setCurrentUser(null);
    setPassword("");
    collection.reset();
    setUsers([]);
    setSelectedRequest(null);
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
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await logout(apiBaseUrl);
      clearSession();
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
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
    if (!detail) return;
    setSelectedRequest(detail.request);
    setApprovals(detail.approvals);
    setDecisionReason("");
    setView("detail");
  }

  async function handleOpenDetail(id: string) {
    const epoch = detailEpoch.current + 1;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await openDetail(id);
    } catch (caughtError) {
      if (epoch === detailEpoch.current) handleApiError(caughtError);
    } finally {
      if (epoch === detailEpoch.current) setLoading(false);
    }
  }

  async function handleDecision(action: "approve" | "reject") {
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const changed = await transitionRequest(
        apiBaseUrl,
        selectedRequest.id,
        action,
        decisionReason.trim() ? { reason: decisionReason.trim() } : undefined
      );
      await refreshRequests();
      await openDetail(changed.id);
      setMessage(action === "approve" ? labels.approveSuccess : labels.rejectSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(input?: { title: string; body: string }) {
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const requestToSubmit = input
        ? await updateRequest(apiBaseUrl, selectedRequest.id, input)
        : selectedRequest;
      const changed = await transitionRequest(apiBaseUrl, requestToSubmit.id, "submit");
      await refreshRequests();
      await openDetail(changed.id);
      setMessage(labels.submitSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleReviseRequest() {
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const changed = await transitionRequest(apiBaseUrl, selectedRequest.id, "revise");
      await refreshRequests();
      await openDetail(changed.id);
      setMessage(labels.reviseSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSelectedRequest(input: { title: string; body: string }) {
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const changed = await updateRequest(apiBaseUrl, selectedRequest.id, input);
      await refreshRequests();
      await openDetail(changed.id);
      setMessage(labels.updateSuccess);
    } catch (caughtError) {
      handleApiError(caughtError);
    } finally {
      setLoading(false);
    }
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
          collection.reset();
          setSelectedRequest(null);
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
              onClick={() => setView(item.view)}
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
          <button className="button quiet" type="button" onClick={() => void handleLogout()} disabled={loading}>
            {labels.logout}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <StatusMessage error={error} message={message} />

        {["dashboard", "requests", "mine", "pending"].includes(view) && !collection.data ? (
          <section className="empty-state" aria-live="polite">
            <p>{collection.error ?? labels.loadingRequests}</p>
            {collection.error ? <button className="button secondary" type="button" onClick={() => void collection.reload()}>{labels.reload}</button> : null}
          </section>
        ) : null}

        {view === "dashboard" && collection.data ? (
          <Dashboard labels={labels} stats={collection.data.summary} pendingApprovals={collection.data.listing.items} onOpenDetail={handleOpenDetail} />
        ) : null}

        {["requests", "mine", "pending"].includes(view) && collection.data ? (
          <RequestList labels={labels} loading={collection.loading} title={currentPageTitle} listing={collection.data.listing} onPage={collection.changePage} onOpenDetail={handleOpenDetail} />
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
            onBack={() => setView("requests")}
            onDecision={handleDecision}
            onDecisionReasonChange={setDecisionReason}
            onReviseRequest={handleReviseRequest}
            onSubmitRequest={handleSubmitRequest}
            onUpdateRequest={handleUpdateSelectedRequest}
          />
        ) : null}
      </section>
    </main>
  );
}

/** 渡された文言と集計だけでダッシュボードを表示する。表示言語の共有状態は参照しない。 */
export function Dashboard({
  labels,
  stats,
  pendingApprovals,
  onOpenDetail
}: {
  labels: Labels;
  stats: RequestSummary;
  pendingApprovals: RequestDto[];
  onOpenDetail: (id: string) => void;
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
        <Metric label={labels.total} value={stats.total} />
        <Metric label={labels.myRequests} value={stats.mine} />
        <Metric label={labels.pending} value={stats.pending} />
        <Metric label={labels.approved} value={stats.approved} />
        <Metric label={labels.rejected} value={stats.rejected} />
        <Metric label={labels.draft} value={stats.drafts} />
      </div>

      <section>
        <div className="section-heading">
          <h3>{labels.pendingApprovals}</h3>
        </div>
        <RequestTable labels={labels} requests={pendingApprovals.slice(0, 5)} onOpenDetail={onOpenDetail} emptyText={labels.noPendingApprovals} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RequestList({ labels, title, listing, loading, onPage, onOpenDetail }: {
  labels: Labels;
  loading: boolean;
  title: string;
  listing: ListRequestsResponse;
  onPage: (page: number) => void;
  onOpenDetail: (id: string) => void;
}) {
  const pages = Math.max(1, Math.ceil(listing.total / listing.limit));
  const start = listing.total === 0 ? 0 : (listing.page - 1) * listing.limit + 1;
  const end = start === 0 ? 0 : start + listing.items.length - 1;
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <div><p className="eyebrow">{labels.requests}</p><h2>{title}</h2></div>
      </section>
      <RequestTable labels={labels} disabled={loading} requests={listing.items} onOpenDetail={onOpenDetail} emptyText={labels.noRequests} />
      <nav className="pagination" aria-busy={loading} aria-label={`${title} pagination`}>
        <p aria-live="polite">{loading ? labels.loadingRequests : null} {start}–{end} / {listing.total} · {listing.page} / {pages}</p>
        <div className="form-actions">
          <button className="button secondary" type="button" disabled={loading || listing.page <= 1} onClick={() => onPage(listing.page - 1)}>{labels.previousPage}</button>
          <button className="button secondary" type="button" disabled={loading || listing.page >= pages} onClick={() => onPage(listing.page + 1)}>{labels.nextPage}</button>
        </div>
      </nav>
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

function RequestDetailView({
  labels,
  approvals,
  currentUser,
  decisionReason,
  loading,
  request,
  onBack,
  onDecision,
  onDecisionReasonChange,
  onReviseRequest,
  onSubmitRequest,
  onUpdateRequest
}: {
  labels: Labels;
  approvals: ApprovalDto[];
  currentUser: AuthUserDto;
  decisionReason: string;
  loading: boolean;
  request: RequestDto | null;
  onBack: () => void;
  onDecision: (action: "approve" | "reject") => void;
  onDecisionReasonChange: (reason: string) => void;
  onReviseRequest: () => void;
  onSubmitRequest: (input?: { title: string; body: string }) => void;
  onUpdateRequest: (input: { title: string; body: string }) => void;
}) {
  const [editForm, setEditForm] = useState({ title: "", body: "" });

  useEffect(() => {
    if (!request) {
      setEditForm({ title: "", body: "" });
      return;
    }

    setEditForm({ title: request.title, body: request.body });
  }, [request?.id, request?.title, request?.body]);

  if (!request) {
    return (
      <div className="screen-grid">
        <p className="empty-state">{labels.noSelectedRequest}</p>
      </div>
    );
  }

  const isOwnRequest = request.createdBy === currentUser.id;
  const canSubmit = request.status === "Draft" && (isOwnRequest || currentUser.role === "Admin");
  const canEdit = request.status === "Draft" && (isOwnRequest || currentUser.role === "Admin");
  const canRevise = request.status === "Rejected" && (isOwnRequest || currentUser.role === "Admin");
  const canDecide =
    request.status === "Pending" &&
    !isOwnRequest &&
    (currentUser.role === "Approver" || currentUser.role === "Admin");

  return (
    <div className="screen-grid">
      <section className="detail-header">
        <div>
          <p className="eyebrow">{labels.requestDetail}</p>
          <h2>{request.title}</h2>
          <span className="detail-id">{request.id}</span>
        </div>
        <StatusBadge labels={labels} status={request.status} />
      </section>

      <section className="detail-layout">
        <div className="detail-main">
          {canEdit ? (
            <div className="stack">
              <label className="field">
                <span>{labels.title}</span>
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                />
              </label>
              <label className="field">
                <span>{labels.body}</span>
                <textarea
                  rows={7}
                  value={editForm.body}
                  onChange={(event) => setEditForm({ ...editForm, body: event.target.value })}
                />
              </label>
              <button
                className="button secondary"
                type="button"
                disabled={loading}
                onClick={() => void onUpdateRequest(editForm)}
              >
                {labels.saveChanges}
              </button>
            </div>
          ) : (
            <div className="field-read">
              <span>{labels.body}</span>
              <p>{request.body}</p>
            </div>
          )}
          <div className="meta-grid">
            <Meta label={labels.team} value={request.teamId} />
            <Meta label={labels.requester} value={request.createdBy} />
            <Meta label={labels.created} value={formatDate(request.createdAt)} />
            <Meta label={labels.updated} value={formatDate(request.updatedAt)} />
          </div>
        </div>

        {canSubmit ? (
          <aside className="decision-panel">
            <h3>{labels.submitRequest}</h3>
            <p>{labels.draftSubmitHelp}</p>
            <button
              className="button primary"
              type="button"
              disabled={loading}
              onClick={() => void onSubmitRequest(canEdit ? editForm : undefined)}
            >
              {loading ? labels.submittingRequest : labels.submitRequest}
            </button>
          </aside>
        ) : canRevise ? (
          <aside className="decision-panel">
            <h3>{labels.reviseRequest}</h3>
            <p>{labels.rejectedReviseHelp}</p>
            <button className="button primary" type="button" disabled={loading} onClick={() => void onReviseRequest()}>
              {loading ? labels.revisingRequest : labels.reviseRequest}
            </button>
          </aside>
        ) : canDecide ? (
          <aside className="decision-panel">
            <h3>{labels.approval}</h3>
            <label className="field">
              <span>{labels.reason}</span>
              <textarea
                rows={5}
                value={decisionReason}
                onChange={(event) => onDecisionReasonChange(event.target.value)}
              />
            </label>
            <div className="decision-actions">
              <button
                className="button approve"
                type="button"
                disabled={loading}
                onClick={() => void onDecision("approve")}
              >
                {labels.approve}
              </button>
              <button
                className="button reject"
                type="button"
                disabled={loading}
                onClick={() => void onDecision("reject")}
              >
                {labels.reject}
              </button>
            </div>
          </aside>
        ) : (
          <aside className="decision-panel muted">
            <h3>{labels.approval}</h3>
            <p>{approvalUnavailableMessage(request.status, isOwnRequest, currentUser.role, labels)}</p>
          </aside>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h3>{labels.approvalHistory}</h3>
          <button className="button quiet" type="button" onClick={onBack}>
            {labels.back}
          </button>
        </div>
        {approvals.length > 0 ? (
          <div className="history-list">
            {approvals.map((approval) => (
              <div className="history-item" key={approval.id}>
                <StatusBadge labels={labels} status={approval.actionType === "Approved" ? "Approved" : "Rejected"} />
                <div>
                  <strong>{shortId(approval.actedBy)}</strong>
                  <p>{approval.reason || labels.noReason}</p>
                </div>
                <span>{formatDate(approval.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">{labels.noApprovalHistory}</p>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status, labels }: { status: RequestDto["status"]; labels: Labels }) {
  return <span className={`status ${status.toLowerCase()}`}>{labels.statusLabels[status]}</span>;
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

function approvalUnavailableMessage(status: RequestDto["status"], isOwnRequest: boolean, role: UserRole, labels: Labels) {
  if (status === "Pending" && role === "Applicant") {
    return labels.pendingApprovalHelp;
  }
  if (status !== "Pending") {
    return labels.approvalAvailableAfterSubmit;
  }

  if (isOwnRequest) {
    return labels.ownRequestApprovalHidden;
  }

  return labels.approvalUnavailable;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
