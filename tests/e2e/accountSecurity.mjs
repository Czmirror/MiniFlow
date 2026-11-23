/** 業務E2Eの入口から呼ぶ本人設定の画面試験。隔離した2セッションでパスワード変更による全失効を確認する。 */
import assert from "node:assert/strict";

/** 既存のloginと記録を再利用する。架空ユーザーだけを更新し、資格情報・Cookieを結果へ出さない。 */
export async function runAccountSecurity({ login, expect, passed, origin }) {
  let passwordChanged = false;
  let checkingWrongPassword = false;
  let checkingOldLogin = false;
  const primary = await login("applicant", ({ status, pathname, method }) =>
    (checkingWrongPassword && pathname === "/api/account/password" && method === "POST" && status === 400)
    || (checkingOldLogin && pathname === "/api/auth/login" && method === "POST" && status === 400));
  const secondary = await login("applicant", ({ status, pathname, method }) =>
    passwordChanged && pathname === "/api/auth/me" && method === "GET" && status === 401);
  const page = primary.page;
  const responseFor = (path, method) => page.waitForResponse(response =>
    response.url() === `${origin}${path}` && response.request().method() === method);
  await page.getByRole("button", { name: "アカウント設定", exact: true }).click();
  await page.getByRole("textbox", { name: "表示名", exact: true }).fill("E2E 本人設定");
  await page.getByRole("combobox", { name: "言語", exact: true }).selectOption("en");
  const profileSaved = responseFor("/api/account", "PATCH");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  assert.equal((await profileSaved).status(), 200);
  await expect(page.getByRole("heading", { name: "Account Settings", level: 1 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Display Name", exact: true })).toHaveValue("E2E 本人設定");
  passed("表示名と言語の保存と英語の設定画面への反映");

  const restored = responseFor("/api/auth/me", "GET");
  await page.reload();
  assert.equal((await restored).status(), 200);
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Account Settings", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Display Name", exact: true })).toHaveValue("E2E 本人設定");
  await expect(page.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
  passed("再読込後の表示名と言語の保持");

  checkingWrongPassword = true;
  await page.getByLabel("Current Password", { exact: true }).fill("wrong-fixture-password");
  await page.getByLabel("New Password", { exact: true }).fill("changed-fixture-password-only");
  const wrong = responseFor("/api/account/password", "POST");
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
  assert.equal((await wrong).status(), 400);
  checkingWrongPassword = false;
  await expect(page.getByRole("heading", { name: "Account Settings", level: 1 })).toBeVisible();
  const stillValid = secondary.page.waitForResponse(response => response.url() === `${origin}/api/auth/me`);
  await secondary.page.reload();
  assert.equal((await stillValid).status(), 200);
  await expect(secondary.page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  passed("現在パスワードの不一致を拒否し既存セッションを維持");

  await page.getByLabel("Current Password", { exact: true }).fill("fixture-password-only");
  const changed = responseFor("/api/account/password", "POST");
  await page.getByRole("button", { name: "Change Password", exact: true }).click();
  assert.equal((await changed).status(), 200);
  passwordChanged = true;
  await expect(page.getByRole("heading", { name: "Login", exact: true })).toBeVisible();
  const cookieNames = (await primary.context.cookies(origin)).map(cookie => cookie.name);
  assert.equal(cookieNames.includes("miniflow_auth"), false);
  assert.equal(cookieNames.includes("miniflow_csrf"), false);
  passed("パスワード変更後の操作側Cookie削除と再ログイン表示");

  const expired = secondary.page.waitForResponse(response => response.url() === `${origin}/api/auth/me`);
  await secondary.page.reload();
  assert.equal((await expired).status(), 401);
  await expect(secondary.page.getByRole("heading", { name: "ログイン", exact: true })).toBeVisible();
  passed("別ブラウザの変更前セッションを401で拒否");

  checkingOldLogin = true;
  await page.getByLabel("Email", { exact: true }).fill("applicant@example.test");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password-only");
  const oldLogin = responseFor("/api/auth/login", "POST");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  assert.equal((await oldLogin).status(), 400);
  checkingOldLogin = false;
  await expect(page.getByRole("heading", { name: "Login", exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("changed-fixture-password-only");
  const csrfReady = responseFor("/api/auth/csrf", "GET");
  const newLogin = responseFor("/api/auth/login", "POST");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  assert.equal((await newLogin).status(), 200);
  const csrfResponse = await csrfReady;
  assert.equal(csrfResponse.status(), 200);
  assert.equal(await csrfResponse.finished(), null);
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  passed("旧パスワードの拒否と新パスワードでの再ログイン");

  await page.getByRole("button", { name: "Account Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("ja");
  const japanese = responseFor("/api/account", "PATCH");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal((await japanese).status(), 200);
  await expect(page.getByRole("heading", { name: "アカウント設定", level: 1 })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "表示名", exact: true })).toHaveValue("E2E 本人設定");
  passed("再ログイン後の日本語への切替と本人情報の保持");
  return { displayName: "E2E 本人設定", language: "ja", invalidatedSessions: 2, rejectedRequests: 2 };
}
