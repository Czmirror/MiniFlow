/** 管理者CLIの新規作成・重複拒否・安全な出力を検証する。実DBへは接続しない。 */
import { describe, expect, it, vi } from "vitest";
import { runAdminCommand } from "../../../../apps/api/src/cli/adminCommand";
import { MemoryUsers } from "../../../support/http";
import { verifyPassword } from "../../../../apps/api/src/infrastructure/auth/password";
import { PrismaUserRepository } from "../../../../apps/api/src/infrastructure/repositories/PrismaUserRepository";

describe("ローカル管理者CLI", () => {
  it("Adminをhash保存し、同じemailを昇格・上書きしない", async () => {
    const users = new MemoryUsers(); const output = vi.fn();
    const env = { MINIFLOW_ADMIN_EMAIL: "admin@example.test", MINIFLOW_ADMIN_PASSWORD: "fixture-admin-password", MINIFLOW_ADMIN_TEAM_ID: "team-1" };
    expect(await runAdminCommand(env, users, output)).toBe(0);
    const admin = await users.findByEmail(env.MINIFLOW_ADMIN_EMAIL);
    expect(admin).toMatchObject({ role: "Admin", teamId: "team-1" });
    expect(await verifyPassword(env.MINIFLOW_ADMIN_PASSWORD, admin!.passwordHash)).toBe(true);
    expect(await runAdminCommand({ ...env, MINIFLOW_ADMIN_PASSWORD: "another-fixture-password" }, users, output)).toBe(1);
    expect(users.writes).toBe(1);
    expect(output.mock.calls.flat().join(" ")).not.toContain(env.MINIFLOW_ADMIN_PASSWORD);
    expect(output.mock.calls.flat().join(" ")).not.toContain(env.MINIFLOW_ADMIN_EMAIL);
  });
  it("入力なしや保存障害でも機密値や例外を出力しない", async () => {
    const users = new MemoryUsers(); const output = vi.fn();
    expect(await runAdminCommand({}, users, output)).toBe(1);
    vi.spyOn(users, "create").mockRejectedValue(new Error("fixture sensitive error"));
    expect(await runAdminCommand({ MINIFLOW_ADMIN_EMAIL: "admin@example.test", MINIFLOW_ADMIN_PASSWORD: "fixture-password", MINIFLOW_ADMIN_TEAM_ID: "team-1" }, users, output)).toBe(1);
    expect(output.mock.calls.flat().join(" ")).not.toContain("sensitive");
  });
});

describe("Prisma password更新契約", () => {
  it("hash更新とsession世代incrementを同じDB更新で実行する", async () => {
    const update = vi.fn().mockResolvedValue({ id: "fixture-user", email: "fixture@example.test", passwordHash: "fixture-hash", sessionVersion: 1, createdAt: new Date(), updatedAt: new Date() });
    const repository = new PrismaUserRepository({ userRecord: { update } } as never);
    await repository.updatePassword({ id: "fixture-user", passwordHash: "fixture-hash" });
    expect(update).toHaveBeenCalledWith({ where: { id: "fixture-user" }, data: { passwordHash: "fixture-hash", sessionVersion: { increment: 1 } } });
  });
});
