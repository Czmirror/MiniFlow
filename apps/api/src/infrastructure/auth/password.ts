/** HTTP・CLIから注入する既存のbcrypt操作。hash方式とラウンド数を一か所で定義する。 */
import type { PasswordOperations } from "../../application/ports/PasswordOperations.js";
import bcrypt from "bcryptjs";

// 既存の運用値であるbcryptの計算コスト10を維持する。
const SALT_ROUNDS = 10;

/** 平文からbcryptの保存用hashを返す。bcryptの失敗はrejectで伝える。 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** 平文とbcrypt hashを照合する。bcryptの失敗はrejectで伝える。 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** 本番の組立でusecaseへ渡すbcrypt実装。usecase内に暗号処理の既定値を持たせない。 */
export const bcryptPasswordOperations: PasswordOperations = { hashPassword, verifyPassword };
