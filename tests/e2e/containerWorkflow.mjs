/** 固定localhostの本番API/実DBで業務E2Eを組み立てる入口。Playwrightは専用tools directoryから読み、管理画面の操作は別moduleへ渡す。 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { runAdminManagement } from "./adminManagement.mjs";

if (!process.argv[2]) throw new Error("Pass the isolated Playwright tools directory");
const requireTool = createRequire(join(resolve(process.argv[2]), "package.json"));
const { chromium } = requireTool("playwright");
const { expect } = requireTool("playwright/test");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(process.argv[3] ?? "/tmp/miniflow-container-e2e-results");
await mkdir(output, { recursive: true });
const origin = "https://localhost:43150";
const title = `コンテナE2E 備品購入 ${Date.now()}`;
const updatedTitle = `${title} 修正済み`;
const reason = "見積もりの内訳を追記してください。";
const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
const contexts = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const result = { browser: browser.version(), steps: [] };
function passed(name) { result.steps.push(name); console.log(`PASS ${name}`); }

// シナリオ固有の意図した拒否だけを呼び出し元が指定し、その他の失敗は結果検査で拒否する。
async function login(role, expectedFailure = () => false) {
  // この固定localhost試験だけの自己署名証明書を許容する。OSの信頼設定は変更しない。
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1100 } });
  contexts.push(context);
  const page = await context.newPage();
  // fixture以外のサイトへ資格情報やCookieを送らない。
  await context.route("**/*", route => {
    const target = new URL(route.request().url());
    return target.origin === origin ? route.continue() : route.abort();
  });
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  let authenticated = false;
  page.on("response", response => {
    if (response.status() < 400) return;
    const pathname = new URL(response.url()).pathname;
    const expected = (!authenticated && pathname === "/api/auth/me" && response.status() === 401)
      || (pathname === "/api/account" && response.request().method() === "PATCH" && response.status() === 403)
      || (role === "outsider" && pathname.startsWith("/api/requests/") && response.status() === 403)
      || expectedFailure({ status: response.status(), pathname, method: response.request().method() });
    httpErrors.push({ status: response.status(), pathname, expected });
  });
  await page.goto(origin);
  await page.getByRole("textbox", { name: "メールアドレス", exact: true }).fill(`${role}@example.test`);
  await page.getByRole("textbox", { name: "パスワード", exact: true }).fill("fixture-password-only");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ダッシュボード", level: 1 })).toBeVisible();
  authenticated = true;
  return { page, context };
}
async function openRequest(page, name) {
  await page.getByRole("button", { name: "申請一覧", exact: true }).click();
  await page.getByRole("row").filter({ hasText: name }).getByRole("button", { name: "詳細", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function reloadAuthenticated(page) {
  // 文書の再読込完了と、Reactが行う本人情報の再取得完了を区別して待つ。
  const restored = page.waitForResponse(response => response.url() === `${origin}/api/auth/me`);
  await page.reload();
  assert.equal((await restored).status(), 200);
  await expect(page.getByRole("heading", { name: "ダッシュボード", level: 1 })).toBeVisible();
}
async function state(page, value) {
  await expect(page.locator(".detail-header").getByText(value, { exact: true })).toBeVisible();
}

try {
  const applicant = await login("applicant");
  const cookies = await applicant.context.cookies(origin);
  for (const name of ["miniflow_auth", "miniflow_csrf"]) {
    const cookie = cookies.find(item => item.name === name);
    assert(cookie?.secure && cookie.sameSite === "Lax" && cookie.path === "/");
    assert.equal(cookie.httpOnly, name === "miniflow_auth");
  }
  passed("本番CookieのSecure・HttpOnly・SameSiteとログイン");
  const csrfStatus = await applicant.page.evaluate(async () => {
    const response = await fetch("/api/account", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ language: "en" }) });
    return response.status;
  });
  assert.equal(csrfStatus, 403);
  passed("CSRFなしのブラウザ更新を拒否");
  await applicant.page.getByRole("button", { name: "申請作成", exact: true }).click();
  await applicant.page.getByRole("textbox", { name: "件名", exact: true }).fill(title);
  await applicant.page.getByRole("textbox", { name: "本文", exact: true }).fill("架空のモニター購入。60,000円。");
  await applicant.page.getByRole("button", { name: "申請する", exact: true }).click();
  await state(applicant.page, "承認待ち");
  result.requestId = await applicant.page.locator(".detail-id").innerText();
  passed("申請の作成と提出");

  const approver = await login("approver");
  await openRequest(approver.page, title);
  await approver.page.getByRole("textbox", { name: "理由", exact: true }).fill(reason);
  await approver.page.getByRole("button", { name: "差し戻し", exact: true }).click();
  await state(approver.page, "差し戻し");
  passed("承認者による理由付き差し戻し");

  await reloadAuthenticated(applicant.page);
  await openRequest(applicant.page, title);
  await expect(applicant.page.getByRole("region", { name: "差し戻し理由" })).toContainText(reason);
  await applicant.page.getByRole("button", { name: "下書きに戻す", exact: true }).click();
  await state(applicant.page, "下書き");
  await applicant.page.getByRole("textbox", { name: "件名", exact: true }).fill(updatedTitle);
  await applicant.page.getByRole("textbox", { name: "本文", exact: true }).fill("架空のモニター2台。1台30,000円、合計60,000円。");
  await applicant.page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(applicant.page.getByRole("heading", { name: updatedTitle, exact: true })).toBeVisible();
  await applicant.page.getByRole("button", { name: "申請する", exact: true }).click();
  await state(applicant.page, "承認待ち");
  passed("差し戻し理由の表示と修正保存・再提出");

  await reloadAuthenticated(approver.page);
  await openRequest(approver.page, updatedTitle);
  await approver.page.getByRole("textbox", { name: "理由", exact: true }).fill("内訳を確認しました。");
  await approver.page.getByRole("button", { name: "承認", exact: true }).click();
  await state(approver.page, "承認済み");
  const history = approver.page.getByRole("region", { name: "承認履歴" });
  await expect(history).toContainText(reason);
  await expect(history).toContainText("内訳を確認しました。");
  passed("同じ承認者による最終承認と2件の判断履歴");
  await approver.page.screenshot({ path: join(output, "approved.png"), fullPage: true });

  const outsider = await login("outsider");
  await outsider.page.getByRole("button", { name: "申請一覧", exact: true }).click();
  await expect(outsider.page.getByText("表示できる申請はありません。", { exact: true })).toBeVisible();
  await expect(outsider.page.getByText(updatedTitle, { exact: true })).toHaveCount(0);
  const outsiderStatus = await outsider.page.evaluate(async id => (await fetch(`/api/requests/${id}`, { credentials: "include" })).status, result.requestId);
  assert.equal(outsiderStatus, 403);
  passed("別チームの一覧非表示と詳細APIの拒否");

  execFileSync("docker", ["compose", "-p", "miniflow-container-e2e", "-f", "tests/integration/container.compose.yml", "restart", "api"], { cwd: root, stdio: "pipe", timeout: 30000 });
  await expect.poll(async () => {
    try { return (await approver.context.request.get(`${origin}/api/auth/me`)).status(); } catch { return 0; }
  }, { timeout: 20000 }).toBe(200);
  await reloadAuthenticated(approver.page);
  await openRequest(approver.page, updatedTitle);
  await state(approver.page, "承認済み");
  await expect(approver.page.getByRole("region", { name: "承認履歴" })).toContainText(reason);
  passed("API再起動後の認証・承認状態・履歴の保持");
  await approver.page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(approver.page.getByRole("heading", { name: "ログイン", exact: true })).toBeVisible();
  assert.equal((await approver.context.cookies(origin)).some(cookie => cookie.name === "miniflow_auth"), false);
  passed("ログアウト時のCookie削除");
  result.admin = await runAdminManagement({ login, reloadAuthenticated, expect, passed, output, origin });
  assert.deepEqual(pageErrors, []);
  // 匿名/無効化の401、権限/CSRF拒否の403、無効ユーザーのlogin 400はHTTP応答も照合する。
  assert.deepEqual(httpErrors.filter(item => !item.expected), []);
  assert.equal(httpErrors.filter(item => item.status === 403).length, 2 + result.admin.forbiddenChecks);
  assert.equal(httpErrors.filter(item => item.status === 400).length, 1);
  assert.equal(consoleErrors.filter(message => !/status of (400|401|403)/.test(message)).length, 0);
  assert(consoleErrors.length <= httpErrors.length);
  result.expectedHttpErrors = httpErrors;
  result.expectedConsoleErrors = consoleErrors.length;
  result.pageErrors = pageErrors.length;
  await writeFile(join(output, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(`PASS all ${result.steps.length} checks; request=${result.requestId}`);
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
