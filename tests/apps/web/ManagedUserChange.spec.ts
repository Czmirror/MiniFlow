/** 本番の本人更新判定について、他人・プロフィールのみ・所属/role変更の境界を確認する。 */
import { describe, expect, it } from "vitest";
import type { AuthUserDto } from "../../../packages/shared/src";
import { managedUserChange } from "../../../apps/web/src/lib/managedUserChange";

const user: AuthUserDto = { id: "fixture-admin", email: "admin@example.test", displayName: "Fixture", language: "ja", teamId: "team-1", role: "Admin", isActive: true };
describe("本人更新時の所属境界", () => {
  it("本人の表示名・言語だけなら入力を維持する", () => {
    expect(managedUserChange(user, { ...user, displayName: "New", language: "en" })).toBe("profile");
    expect(managedUserChange(user, { ...user })).toBe("profile");
  });
  it.each([{ teamId: "team-2" }, { role: "Applicant" as const }, { teamId: "team-2", role: "Approver" as const }])("本人の所属・role変更は入力を破棄する: %j", change => {
    expect(managedUserChange(user, { ...user, ...change })).toBe("context");
  });
  it("他人の所属やrole変更は本人情報を変更しない", () => {
    expect(managedUserChange(user, { ...user, id: "other", teamId: "team-2", role: "Applicant" })).toBe("other");
  });
});
