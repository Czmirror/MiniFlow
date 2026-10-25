/** ローカル管理者CLIの入力と安全な出力を担当する。DBを生成せず保存契約を受け取る。 */
import type { UserRepository } from "../application/ports/UserRepository.js";
import { registerUser } from "../application/auth/RegisterUser.js";
import { requiredText } from "../application/auth/validation/profile.js";

/** 環境から管理者を新規作成し終了codeを返す。既存emailを昇格・更新せず、機密入力は出力しない。 */
export async function runAdminCommand(env: NodeJS.ProcessEnv, repository: UserRepository, writeLine: (message: string) => void): Promise<number> {
  try {
    const email = requiredText(env.MINIFLOW_ADMIN_EMAIL, "admin email");
    const password = env.MINIFLOW_ADMIN_PASSWORD;
    if (!password) throw new Error("password required");
    const teamId = requiredText(env.MINIFLOW_ADMIN_TEAM_ID, "admin team");
    await registerUser(repository, { email, password, teamId, role: "Admin" });
    writeLine("管理者を作成しました。");
    return 0;
  } catch {
    writeLine("管理者を作成できませんでした。環境変数、重複メール、DB接続を確認してください。");
    return 1;
  }
}
