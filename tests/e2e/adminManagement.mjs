/** 既存のE2E入口から呼ぶ管理者操作の画面試験。架空ユーザー1人だけを作成・変更・無効化する。 */
import assert from "node:assert/strict";
import { join } from "node:path";

/** 同じlocalhostのlogin/復帰helperを再利用し、操作結果を返す。Cookieやpasswordは記録しない。 */
export async function runAdminManagement({ login, reloadAuthenticated, expect, passed, output, origin }) {
  const email = "managed-e2e@example.test";
  const admin = await login("admin");
  await admin.page.getByRole("button", { name: "ユーザー管理", exact: true }).click();
  const form = admin.page.locator("form");
  await form.getByRole("textbox", { name: "メールアドレス", exact: true }).fill(email);
  await form.getByRole("textbox", { name: "パスワード", exact: true }).fill("fixture-password-only");
  await form.getByRole("textbox", { name: "表示名", exact: true }).fill("E2E 管理対象");
  await form.getByRole("textbox", { name: "チーム", exact: true }).fill("team-1");
  await form.getByRole("combobox", { name: "言語", exact: true }).selectOption("ja");
  await form.getByRole("combobox", { name: "ロール", exact: true }).selectOption("Applicant");
  const createdResponse = admin.page.waitForResponse(response => response.url() === `${origin}/api/users` && response.request().method() === "POST");
  await form.getByRole("button", { name: "ユーザー作成", exact: true }).click();
  const created = await createdResponse;
  assert.equal(created.status(), 201);
  const createdUser = await created.json();
  const row = admin.page.getByRole("row").filter({ hasText: email });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("E2E 管理対象");
  passed("管理者によるユーザー作成と一覧への反映");

  let disabled = false;
  const managed = await login("managed-e2e", ({ status, pathname, method }) => {
    const forbiddenManagement = pathname === "/api/users" && status === 403 && ["GET", "POST"].includes(method);
    const disabledSession = disabled && pathname === "/api/auth/me" && status === 401 && method === "GET";
    const disabledLogin = disabled && pathname === "/api/auth/login" && status === 400 && method === "POST";
    return forbiddenManagement || disabledSession || disabledLogin;
  });
  await expect(managed.page.getByRole("button", { name: "ユーザー管理", exact: true })).toHaveCount(0);
  const forbidden = await managed.page.evaluate(async () => {
    const listing = await fetch("/api/users", { credentials: "include" });
    const csrf = await fetch("/api/auth/csrf", { credentials: "include" });
    if (!csrf.ok) throw new Error("CSRF fetch failed");
    const { csrfToken } = await csrf.json();
    const creation = await fetch("/api/users", { method: "POST", credentials: "include", headers: {
      "content-type": "application/json", "x-csrf-token": csrfToken
    }, body: JSON.stringify({ email: "forbidden-e2e@example.test", password: "fixture-password-only",
      displayName: "拒否確認", language: "ja", teamId: "team-1", role: "Admin" }) });
    return [listing.status, creation.status];
  });
  assert.deepEqual(forbidden, [403, 403]);
  passed("一般ユーザーの管理画面非表示と一覧・作成APIの拒否");

  await row.getByRole("button", { name: "ユーザー編集", exact: true }).click();
  // 編集行の表示名・所属列にある入力を指定する。アプリのラベル/認可はここで補わない。
  await row.getByRole("cell").nth(1).getByRole("textbox").fill("E2E 管理変更済み");
  await row.getByRole("cell").nth(2).getByRole("textbox").fill("team-2");
  await row.getByRole("cell").nth(3).getByRole("combobox").selectOption("Approver");
  const updatedResponse = admin.page.waitForResponse(response => response.url() === `${origin}/api/users/${createdUser.id}` && response.request().method() === "PATCH");
  await row.getByRole("button", { name: "保存", exact: true }).click();
  assert.equal((await updatedResponse).status(), 200);
  await expect(row).toContainText("E2E 管理変更済み");
  await expect(row).toContainText("team-2");
  await expect(row).toContainText("承認者");
  passed("管理者による表示名・所属・ロールの変更");

  await reloadAuthenticated(managed.page);
  await expect(managed.page.getByText("承認者", { exact: true })).toBeVisible();
  const actor = await managed.page.evaluate(async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) throw new Error("Current user fetch failed");
    const user = await response.json();
    return { role: user.role, teamId: user.teamId };
  });
  assert.deepEqual(actor, { role: "Approver", teamId: "team-2" });
  await managed.page.getByRole("button", { name: "申請作成", exact: true }).click();
  await expect(managed.page.locator(".readonly-field")).toContainText("team-2");
  await expect(managed.page.getByRole("textbox", { name: "チーム", exact: true })).toHaveCount(0);
  passed("既存セッションへの所属・ロール反映と所属の読み取り専用表示");

  const disabledResponse = admin.page.waitForResponse(response => response.url() === `${origin}/api/users/${createdUser.id}` && response.request().method() === "PATCH");
  await row.getByRole("button", { name: "無効化", exact: true }).click();
  const changed = await disabledResponse;
  assert.equal(changed.status(), 200);
  const inactive = await changed.json();
  assert.equal(inactive.isActive, false);
  await expect(row.getByRole("cell").nth(5)).toHaveText("無効");
  disabled = true;
  const rejected = managed.page.waitForResponse(response => response.url() === `${origin}/api/auth/me`);
  await managed.page.reload();
  assert.equal((await rejected).status(), 401);
  await expect(managed.page.getByRole("heading", { name: "ログイン", exact: true })).toBeVisible();
  await managed.page.getByRole("textbox", { name: "メールアドレス", exact: true }).fill(email);
  await managed.page.getByRole("textbox", { name: "パスワード", exact: true }).fill("fixture-password-only");
  const failedLogin = managed.page.waitForResponse(response => response.url() === `${origin}/api/auth/login` && response.request().method() === "POST");
  await managed.page.getByRole("button", { name: "ログイン", exact: true }).click();
  assert.equal((await failedLogin).status(), 400);
  await expect(managed.page.getByRole("heading", { name: "ログイン", exact: true })).toBeVisible();
  await expect(admin.page.getByText("forbidden-e2e@example.test", { exact: true })).toHaveCount(0);
  passed("無効化後の既存セッションと再ログインの拒否");
  await admin.page.screenshot({ path: join(output, "users-disabled.png"), fullPage: true });
  return { userId: inactive.id, role: inactive.role, teamId: inactive.teamId, isActive: inactive.isActive, forbiddenChecks: forbidden.length };
}
