/** DB権限のある運用者だけが実行する管理者CLI。値は環境から受け、引数やログへ表示しない。 */
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../infrastructure/repositories/PrismaUserRepository.js";
import { runAdminCommand } from "./adminCommand.js";

const prisma = new PrismaClient({ log: [] });
try {
  if (process.argv.length > 2) {
    console.error("入力値は引数ではなく環境変数で指定してください。");
    process.exitCode = 1;
  } else {
    process.exitCode = await runAdminCommand(process.env, new PrismaUserRepository(prisma), line => console.log(line));
  }
} finally {
  try { await prisma.$disconnect(); }
  catch { console.error("DB接続の終了処理に失敗しました。"); process.exitCode = 1; }
}
