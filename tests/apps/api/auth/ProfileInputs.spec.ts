/** auth usecaseをHTTP以外から呼ぶ場合も、部分更新・列挙値・型の契約を維持することを検証する。 */
import { describe, expect, it } from "vitest";
import { updateAccount } from "../../../../apps/api/src/application/auth/UpdateAccount";
import { updateUser } from "../../../../apps/api/src/application/auth/UpdateUser";
import { registerUser } from "../../../../apps/api/src/application/auth/RegisterUser";
import { InputValidationError } from "../../../../apps/api/src/application/errors/InputValidationError";
import { MemoryUsers } from "../../../support/http";
import { User } from "../../../../apps/api/src/domain/user/User";

function repository() {
  const users = new MemoryUsers();
  users.users.set("user-1", new User({ id: "user-1", email: "fixture@example.test", passwordHash: "fixture-hash", displayName: "Original", language: "en", createdAt: new Date(), updatedAt: new Date() }));
  return users;
}

describe("profile入力と部分更新", () => {
  it("名前だけ・言語だけの更新と、表示名の明示削除を区別する", async () => {
    const users = repository();
    expect(await updateAccount(users, { userId: "user-1", displayName: " New " })).toMatchObject({ displayName: "New", language: "en" });
    expect(await updateAccount(users, { userId: "user-1", language: "ja" })).toMatchObject({ displayName: "New", language: "ja" });
    expect(await updateAccount(users, { userId: "user-1", displayName: null })).toMatchObject({ displayName: null, language: "ja" });
  });
  it.each([{ displayName: 9 }, { language: null }, { language: "fr" }])("profileの型違いを保存前に拒否する: %j", async invalid => {
    const users = repository();
    // runtime入力を意図的に型境界の外から渡す、400の回帰試験。
    await expect(updateAccount(users, { userId: "user-1", ...invalid } as never)).rejects.toBeInstanceOf(InputValidationError);
    expect(users.writes).toBe(0);
  });
  it.each([{ role: "Root" }, { teamId: null }, { isActive: "false" }])("管理者入力も未知値・型違いで未保存: %j", async invalid => {
    const users = repository();
    await expect(updateUser(users, { id: "user-1", ...invalid } as never)).rejects.toBeInstanceOf(InputValidationError);
    expect(users.writes).toBe(0);
  });
  it.each([{ role: "Root" }, { teamId: null }, { language: "fr" }])("新規ユーザーも無効なprofileでは作成しない: %j", async invalid => {
    const users = repository();
    await expect(registerUser(users, { email: "new@example.test", password: "fixture-password-only", ...invalid } as never)).rejects.toBeInstanceOf(InputValidationError);
    expect(users.writes).toBe(0);
  });
});
