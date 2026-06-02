"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
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
import { createRequest, getRequest, listRequests, transitionRequest, updateRequest } from "../lib/requestApi";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const defaultTeamId = "team-1";

type View = "dashboard" | "requests" | "mine" | "pending" | "create" | "detail" | "account" | "users";
type Locale = "ja" | "en";

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

const locale: Locale = "ja";
const messages = {
  ja: {
    appTitle: "ダッシュボード",
    login: "ログイン",
    loggingIn: "ログイン中",
    logout: "ログアウト",
    email: "メールアドレス",
    password: "パスワード",
    team: "チーム",
    overview: "概要",
    requests: "申請",
    dashboard: "ダッシュボード",
    requestList: "申請一覧",
    myRequests: "自分の申請",
    pendingApprovals: "承認待ち",
    requestCreate: "申請作成",
    requestDetail: "申請詳細",
    total: "合計",
    pending: "承認待ち",
    approved: "承認済み",
    rejected: "差し戻し",
    draft: "下書き",
    deleted: "削除済み",
    title: "件名",
    status: "状態",
    requester: "申請者",
    updated: "更新日時",
    created: "作成日時",
    detail: "詳細",
    body: "本文",
    approval: "承認",
    approvalHistory: "承認履歴",
    reason: "理由",
    approve: "承認",
    reject: "差し戻し",
    create: "作成",
    creating: "作成中",
    back: "戻る",
    noPendingApprovals: "承認待ちはありません。",
    noRequests: "表示できる申請はありません。",
    noSelectedRequest: "申請が選択されていません。",
    noApprovalHistory: "承認履歴はありません。",
    noReason: "理由なし",
    accountSettings: "アカウント設定",
    userManagement: "ユーザー管理",
    displayName: "表示名",
    language: "言語",
    japanese: "日本語",
    english: "English",
    save: "保存",
    saving: "保存中",
    passwordChange: "パスワード変更",
    currentPassword: "現在のパスワード",
    newPassword: "新しいパスワード",
    changePassword: "パスワードを変更",
    createUser: "ユーザー作成",
    editUser: "ユーザー編集",
    disableUser: "無効化",
    enableUser: "有効化",
    active: "有効",
    inactive: "無効",
    role: "ロール",
    applicant: "申請者",
    approver: "承認者",
    admin: "管理者",
    saveDraft: "下書き保存",
    savingDraft: "保存中",
    submitRequest: "申請する",
    submittingRequest: "申請中",
    submitSuccess: "申請しました。",
    reviseRequest: "修正する",
    revisingRequest: "修正中",
    reviseSuccess: "下書きに戻しました。内容を修正して再申請できます。",
    saveChanges: "変更を保存",
    updateSuccess: "申請内容を保存しました。",
    draftSubmitHelp: "下書きを提出すると、承認者が承認または差し戻しできます。",
    rejectedReviseHelp: "差し戻された申請は、下書きに戻して修正できます。",
    pendingApprovalHelp: "承認待ちです。承認者の判断を待っています。",
    userCreated: "ユーザーを作成しました。",
    userUpdated: "ユーザーを更新しました。",
    accountUpdated: "アカウント設定を保存しました。",
    passwordChanged: "パスワードを変更しました。",
    loginSuccess: "ログインしました。",
    createSuccess: "下書きを保存しました。",
    approveSuccess: "承認しました。",
    rejectSuccess: "差し戻しました。",
    approvalAvailableAfterSubmit: "承認操作は、申請が提出された後に利用できます。",
    ownRequestApprovalHidden: "自分が作成した申請のため、承認操作は表示していません。",
    approvalUnavailable: "この申請では承認操作を利用できません。",
    statusLabels: {
      Draft: "下書き",
      Pending: "承認待ち",
      Approved: "承認済み",
      Rejected: "差し戻し",
      Deleted: "削除済み"
    }
  },
  en: {
    appTitle: "Dashboard",
    login: "Login",
    loggingIn: "Logging in",
    logout: "Logout",
    email: "Email",
    password: "Password",
    team: "Team",
    overview: "Overview",
    requests: "Requests",
    dashboard: "Dashboard",
    requestList: "Request List",
    myRequests: "My Requests",
    pendingApprovals: "Pending Approvals",
    requestCreate: "Request Create",
    requestDetail: "Request Detail",
    total: "Total",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    draft: "Draft",
    deleted: "Deleted",
    title: "Title",
    status: "Status",
    requester: "Requester",
    updated: "Updated",
    created: "Created",
    detail: "Detail",
    body: "Body",
    approval: "Approval",
    approvalHistory: "Approval History",
    reason: "Reason",
    approve: "Approve",
    reject: "Reject",
    create: "Create",
    creating: "Creating",
    back: "Back",
    noPendingApprovals: "No pending approvals.",
    noRequests: "No requests to show.",
    noSelectedRequest: "No request is selected.",
    noApprovalHistory: "No approval history.",
    noReason: "No reason",
    accountSettings: "Account Settings",
    userManagement: "User Management",
    displayName: "Display Name",
    language: "Language",
    japanese: "Japanese",
    english: "English",
    save: "Save",
    saving: "Saving",
    passwordChange: "Password Change",
    currentPassword: "Current Password",
    newPassword: "New Password",
    changePassword: "Change Password",
    createUser: "Create User",
    editUser: "Edit User",
    disableUser: "Disable",
    enableUser: "Enable",
    active: "Active",
    inactive: "Inactive",
    role: "Role",
    applicant: "Applicant",
    approver: "Approver",
    admin: "Admin",
    saveDraft: "Save Draft",
    savingDraft: "Saving",
    submitRequest: "Submit",
    submittingRequest: "Submitting",
    submitSuccess: "Submitted.",
    reviseRequest: "Revise",
    revisingRequest: "Revising",
    reviseSuccess: "Returned to draft. You can edit and resubmit it.",
    saveChanges: "Save Changes",
    updateSuccess: "Request changes saved.",
    draftSubmitHelp: "Submit the draft so an approver can approve or reject it.",
    rejectedReviseHelp: "Rejected requests can be returned to draft for editing.",
    pendingApprovalHelp: "This request is pending approval.",
    userCreated: "User created.",
    userUpdated: "User updated.",
    accountUpdated: "Account settings saved.",
    passwordChanged: "Password changed.",
    loginSuccess: "Logged in.",
    createSuccess: "Draft saved.",
    approveSuccess: "Approved.",
    rejectSuccess: "Rejected.",
    approvalAvailableAfterSubmit: "Approval actions are available only after the request is submitted.",
    ownRequestApprovalHidden: "This is your own request, so approval actions are hidden.",
    approvalUnavailable: "Approval actions are not available for this request.",
    statusLabels: {
      Draft: "Draft",
      Pending: "Pending",
      Approved: "Approved",
      Rejected: "Rejected",
      Deleted: "Deleted"
    }
  }
} as const;

let labels: (typeof messages)[Locale] = messages[locale];

export function MiniFlowApp() {
  const [currentUser, setCurrentUser] = useState<AuthUserDto | null>(null);
  const [locale, setLocale] = useState<Locale>("ja");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password1234");
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [requests, setRequests] = useState<RequestDto[]>([]);
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

  labels = messages[locale];
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

  const stats = useMemo(() => {
    const visible = requests.filter((request) => request.status !== "Deleted");
    return {
      total: visible.length,
      drafts: visible.filter((request) => request.status === "Draft").length,
      pending: visible.filter((request) => request.status === "Pending").length,
      approved: visible.filter((request) => request.status === "Approved").length,
      rejected: visible.filter((request) => request.status === "Rejected").length,
      mine: currentUser ? visible.filter((request) => request.createdBy === currentUser.id).length : 0
    };
  }, [currentUser, requests]);

  const myRequests = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return requests.filter((request) => request.status !== "Deleted" && request.createdBy === currentUser.id);
  }, [currentUser, requests]);

  const pendingApprovals = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === "Applicant") {
      return [];
    }

    return requests.filter((request) => request.status === "Pending" && request.createdBy !== currentUser.id);
  }, [currentUser, requests]);

  async function initialize() {
    setLoading(true);
    setError(null);

    try {
      const user = await fetchCurrentUser(apiBaseUrl);
      setCurrentUser(user);
      if (user) {
        applyUserSettings(user);
        await refreshRequests();
        if (user.role === "Admin") {
          await refreshUsers();
        }
      }
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
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
      await refreshRequests();
      if (user.role === "Admin") {
        await refreshUsers();
      }
      setView("dashboard");
      setMessage(labels.loginSuccess);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
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
      setCurrentUser(null);
      setRequests([]);
      setUsers([]);
      setSelectedRequest(null);
      setApprovals([]);
      setView("dashboard");
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function refreshRequests() {
    const response = await listRequests(apiBaseUrl, false);
    setRequests(response.items);
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
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: string) {
    const detail = await getRequest(apiBaseUrl, id);
    setSelectedRequest(detail.request);
    setApprovals(detail.approvals);
    setDecisionReason("");
    setView("detail");
  }

  async function handleOpenDetail(id: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await openDetail(id);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
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
      setError(toErrorMessage(caughtError));
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
      setError(toErrorMessage(caughtError));
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
      setError(toErrorMessage(caughtError));
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
      setError(toErrorMessage(caughtError));
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
      setError(toErrorMessage(caughtError));
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
      const user = await changePassword(apiBaseUrl, passwordForm);
      setCurrentUser(user);
      setPasswordForm(initialPasswordForm);
      setMessage(labels.passwordChanged);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
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
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function handleUserUpdate(
    user: UserManagementDto,
    input: { displayName?: string | null; language?: Locale; teamId?: string; isActive?: boolean }
  ) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await updateUser(apiBaseUrl, user.id, {
        displayName: user.displayName,
        language: user.language,
        teamId: user.teamId,
        role: user.role,
        ...input
      });
      await refreshUsers();
      setMessage(labels.userUpdated);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
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
            <span>{roleLabel(currentUser.role)}</span>
            <small>{currentUser.id}</small>
          </div>
          <button className="button quiet" type="button" onClick={() => void handleLogout()} disabled={loading}>
            {labels.logout}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <StatusMessage error={error} message={message} />

        {view === "dashboard" ? (
          <Dashboard stats={stats} pendingApprovals={pendingApprovals} onOpenDetail={handleOpenDetail} />
        ) : null}

        {view === "requests" ? (
          <RequestList title={labels.requestList} requests={requests.filter((request) => request.status !== "Deleted")} onOpenDetail={handleOpenDetail} />
        ) : null}

        {view === "mine" ? (
          <RequestList title={labels.myRequests} requests={myRequests} onOpenDetail={handleOpenDetail} />
        ) : null}

        {view === "pending" ? (
          <RequestList title={labels.pendingApprovals} requests={pendingApprovals} onOpenDetail={handleOpenDetail} />
        ) : null}

        {view === "create" ? (
          <CreateRequestView
            form={createForm}
            loading={loading}
            onChange={setCreateForm}
            onSaveDraft={handleCreateDraft}
            onSubmitRequest={handleCreateAndSubmit}
          />
        ) : null}

        {view === "account" ? (
          <AccountSettingsView
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

function Dashboard({
  stats,
  pendingApprovals,
  onOpenDetail
}: {
  stats: { total: number; drafts: number; pending: number; approved: number; rejected: number; mine: number };
  pendingApprovals: RequestDto[];
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <p className="eyebrow">{labels.overview}</p>
        <h2>{labels.dashboard}</h2>
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
        <RequestTable requests={pendingApprovals.slice(0, 5)} onOpenDetail={onOpenDetail} emptyText={labels.noPendingApprovals} />
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

function RequestList({
  title,
  requests,
  onOpenDetail
}: {
  title: string;
  requests: RequestDto[];
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <p className="eyebrow">{labels.requests}</p>
        <h2>{title}</h2>
      </section>
      <RequestTable requests={requests} onOpenDetail={onOpenDetail} emptyText={labels.noRequests} />
    </div>
  );
}

function RequestTable({
  requests,
  emptyText,
  onOpenDetail
}: {
  requests: RequestDto[];
  emptyText: string;
  onOpenDetail: (id: string) => void;
}) {
  if (requests.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="table-wrap">
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
                <StatusBadge status={request.status} />
              </td>
              <td>{shortId(request.createdBy)}</td>
              <td>{formatDate(request.updatedAt)}</td>
              <td>
                <button className="button table-action" type="button" onClick={() => void onOpenDetail(request.id)}>
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
  form,
  loading,
  onChange,
  onSaveDraft,
  onSubmitRequest
}: {
  form: CreateRequestInput;
  loading: boolean;
  onChange: (form: CreateRequestInput) => void;
  onSaveDraft: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRequest: (input?: { title: string; body: string }) => void;
}) {
  return (
    <div className="screen-grid">
      <section className="screen-header">
        <p className="eyebrow">{labels.requests}</p>
        <h2>{labels.requestCreate}</h2>
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
  accountForm,
  loading,
  passwordForm,
  onAccountChange,
  onAccountSubmit,
  onPasswordChange,
  onPasswordSubmit
}: {
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
        <p className="eyebrow">{labels.accountSettings}</p>
        <h2>{labels.accountSettings}</h2>
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
  currentUser,
  form,
  loading,
  users,
  onCreate,
  onFormChange,
  onUpdate
}: {
  currentUser: AuthUserDto;
  form: typeof initialUserForm;
  loading: boolean;
  users: UserManagementDto[];
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: typeof initialUserForm) => void;
  onUpdate: (
    user: UserManagementDto,
    input: { displayName?: string | null; language?: Locale; teamId?: string; role?: UserRole; isActive?: boolean }
  ) => void;
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
        <p className="eyebrow">{labels.userManagement}</p>
        <h2>{labels.userManagement}</h2>
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

      <div className="table-wrap">
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
                    roleLabel(user.role)
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
                      onClick={() => {
                        onUpdate(user, editForm);
                        setEditingUserId(null);
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
        <StatusBadge status={request.status} />
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
            <p>{approvalUnavailableMessage(request.status, isOwnRequest, currentUser.role)}</p>
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
                <StatusBadge status={approval.actionType === "Approved" ? "Approved" : "Rejected"} />
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

function StatusBadge({ status }: { status: RequestDto["status"] }) {
  return <span className={`status ${status.toLowerCase()}`}>{labels.statusLabels[status]}</span>;
}

function StatusMessage({ error, message }: { error: string | null; message: string | null }) {
  if (!error && !message) {
    return null;
  }

  return <p className={error ? "notice error" : "notice success"}>{error ?? message}</p>;
}

function roleLabel(role: UserRole) {
  if (role === "Admin") {
    return labels.admin;
  }
  if (role === "Approver") {
    return labels.approver;
  }

  return labels.applicant;
}

function approvalUnavailableMessage(status: RequestDto["status"], isOwnRequest: boolean, role: UserRole) {
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
