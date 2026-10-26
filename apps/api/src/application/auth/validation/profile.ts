/** 認証・ユーザー管理usecaseで共有するprofileの入力条件。未指定と明示的なnullを区別する。 */
import { InputValidationError } from "../../errors/InputValidationError.js";
import type { UserRole } from "../../../domain/user/User.js";

/** 空白を除いた非空の識別子を返す。型違い・空は400。 */
export function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new InputValidationError(`${field} is required`);
  return value.trim();
}

/** 省略は維持、null/空白は削除を表す。 */
export function optionalDisplayName(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") throw new InputValidationError("displayName must be text or null");
  return value.trim() || null;
}

/** サポート済み言語だけを許可する。省略の既定値は呼び出し元が決める。 */
export function optionalLanguage(value: unknown): "ja" | "en" | undefined {
  if (value === undefined || value === "ja" || value === "en") return value;
  throw new InputValidationError("language must be ja or en");
}

/** 許可されたroleだけを返す。未知の権限値を保存しない。 */
export function optionalRole(value: unknown): UserRole | undefined {
  if (value === undefined || value === "Applicant" || value === "Approver" || value === "Admin") return value;
  throw new InputValidationError("role must be Applicant, Approver or Admin");
}

/** falseを未指定と区別して返す。 */
export function optionalActive(value: unknown): boolean | undefined {
  if (value === undefined || typeof value === "boolean") return value;
  throw new InputValidationError("isActive must be boolean");
}
