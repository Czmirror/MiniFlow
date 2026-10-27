/** 本番の認証usecaseへ暗号操作を注入し、呼び出し順序と失敗時の未保存を確認する。実DBと実パスワードは使わない。 */
import { describe, expect, it, vi } from "vitest";
import { loginUser } from "../../../../apps/api/src/application/auth/LoginUser";
import { registerUser } from "../../../../apps/api/src/application/auth/RegisterUser";
import { changePassword } from "../../../../apps/api/src/application/auth/ChangePassword";
import { InputValidationError } from "../../../../apps/api/src/application/errors/InputValidationError";
import { StateConflictError } from "../../../../apps/api/src/domain/errors/StateConflictError";
import { User } from "../../../../apps/api/src/domain/user/User";
import { MemoryUsers } from "../../../support/http";

const password = "fixture-current-password";
const newPassword = "fixture-new-password";
const existingHash = "fixture-existing-hash";
function fixture(isActive = true) {
  const users = new MemoryUsers();
  const user = new User({ id: "fixture-user", email: "fixture@example.test", passwordHash: existingHash, isActive, createdAt: new Date("2026-10-27T00:00:00Z"), updatedAt: new Date("2026-10-27T00:00:00Z") });
  users.users.set(user.id, user);
  const calls: string[] = [];
  const passwords = {
    verifyPassword: vi.fn(async (_plain: string, _hash: string) => { calls.push("verify"); return true; }),
    hashPassword: vi.fn(async (_plain: string) => { calls.push("hash"); return "fixture-new-hash"; })
  };
  return { users, user, passwords, calls };
}

describe("注入されたパスワード操作", () => {
  it("loginは保存済みhashを照合し、有効な本人を返すだけで保存しない", async () => {
    const f = fixture();
    expect(await loginUser(f.users, { email: " fixture@example.test ", password }, f.passwords)).toBe(f.user);
    expect(f.passwords.verifyPassword).toHaveBeenCalledExactlyOnceWith(password, existingHash);
    expect(f.passwords.hashPassword).not.toHaveBeenCalled();
    expect(f.users.writes).toBe(0);
  });
  it.each(["missing", "disabled"])("loginの%sユーザーは暗号処理前に拒否する", async state => {
    const f = fixture(state !== "disabled");
    if (state === "missing") f.users.users.clear();
    await expect(loginUser(f.users, { email: f.user.email, password }, f.passwords)).rejects.toBeInstanceOf(InputValidationError);
    expect(f.calls).toEqual([]);
    expect(f.users.writes).toBe(0);
  });
  it("loginの不一致は拒否し、照合障害は元の例外を伝える", async () => {
    const f = fixture();
    f.passwords.verifyPassword.mockResolvedValueOnce(false);
    await expect(loginUser(f.users, { email: f.user.email, password }, f.passwords)).rejects.toThrow("invalid email or password");
    const failure = new Error("fixture verifier failure");
    f.passwords.verifyPassword.mockRejectedValueOnce(failure);
    await expect(loginUser(f.users, { email: f.user.email, password }, f.passwords)).rejects.toBe(failure);
    expect(f.users.writes).toBe(0);
    expect(f.passwords.hashPassword).not.toHaveBeenCalled();
  });
  it("新規作成は注入されたhashだけを保存し、平文を保存しない", async () => {
    const f = fixture();
    const created = await registerUser(f.users, { email: "new@example.test", password }, f.passwords);
    expect(f.passwords.hashPassword).toHaveBeenCalledExactlyOnceWith(password);
    expect(f.passwords.verifyPassword).not.toHaveBeenCalled();
    expect(created).toMatchObject({ email: "new@example.test", passwordHash: "fixture-new-hash", role: "Applicant" });
    expect(f.users.writes).toBe(1);
  });
  it("重複emailではhashを作らず、既存ユーザーを上書きしない", async () => {
    const f = fixture();
    await expect(registerUser(f.users, { email: f.user.email, password }, f.passwords)).rejects.toBeInstanceOf(StateConflictError);
    expect(f.calls).toEqual([]);
    expect(f.users.writes).toBe(0);
    expect(await f.users.findById(f.user.id)).toBe(f.user);
  });
  it("新規hash作成の障害ではユーザーを作らず、元の例外を伝える", async () => {
    const f = fixture(); const failure = new Error("fixture hasher failure");
    f.passwords.hashPassword.mockRejectedValueOnce(failure);
    await expect(registerUser(f.users, { email: "new@example.test", password }, f.passwords)).rejects.toBe(failure);
    expect(f.users.writes).toBe(0);
    expect(await f.users.findByEmail("new@example.test")).toBeNull();
  });
  it("変更は現在passwordの照合後にhashを作り、認証世代と同時に更新する", async () => {
    const f = fixture();
    const changed = await changePassword(f.users, { userId: f.user.id, currentPassword: password, newPassword }, f.passwords);
    expect(f.calls).toEqual(["verify", "hash"]);
    expect(f.passwords.verifyPassword).toHaveBeenCalledExactlyOnceWith(password, existingHash);
    expect(f.passwords.hashPassword).toHaveBeenCalledExactlyOnceWith(newPassword);
    expect(changed).toMatchObject({ passwordHash: "fixture-new-hash", sessionVersion: 1 });
    expect(f.users.writes).toBe(1);
  });
  it("変更対象が存在しなければ暗号操作せずnullを返す", async () => {
    const f = fixture();
    expect(await changePassword(f.users, { userId: "missing", currentPassword: password, newPassword }, f.passwords)).toBeNull();
    expect(f.calls).toEqual([]);
    expect(f.users.writes).toBe(0);
  });
  it("現在passwordが不一致なら新hashを作らず未保存", async () => {
    const f = fixture(); f.passwords.verifyPassword.mockResolvedValueOnce(false);
    await expect(changePassword(f.users, { userId: f.user.id, currentPassword: password, newPassword }, f.passwords)).rejects.toThrow("current password is invalid");
    expect(f.passwords.hashPassword).not.toHaveBeenCalled();
    expect(f.users.writes).toBe(0);
  });
  it.each(["verify", "hash"])("変更の%s障害では保存と認証世代更新を行わない", async operation => {
    const f = fixture(); const failure = new Error("fixture crypto failure");
    if (operation === "verify") f.passwords.verifyPassword.mockRejectedValueOnce(failure);
    else f.passwords.hashPassword.mockRejectedValueOnce(failure);
    await expect(changePassword(f.users, { userId: f.user.id, currentPassword: password, newPassword }, f.passwords)).rejects.toBe(failure);
    expect(f.users.writes).toBe(0);
    expect(await f.users.findById(f.user.id)).toBe(f.user);
    if (operation === "verify") expect(f.passwords.hashPassword).not.toHaveBeenCalled();
  });
  it("入力不正は暗号操作と保存の前に拒否する", async () => {
    const f = fixture();
    await expect(loginUser(f.users, { email: f.user.email, password: "short" }, f.passwords)).rejects.toBeInstanceOf(InputValidationError);
    await expect(registerUser(f.users, { email: "invalid", password }, f.passwords)).rejects.toBeInstanceOf(InputValidationError);
    await expect(changePassword(f.users, { userId: f.user.id, currentPassword: password, newPassword: "short" }, f.passwords)).rejects.toBeInstanceOf(InputValidationError);
    expect(f.calls).toEqual([]);
    expect(f.users.writes).toBe(0);
  });
});
