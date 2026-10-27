/** 認証usecaseが必要とするパスワード操作。暗号実装はHTTPやCLIの組立で渡し、ここでは選ばない。 */

/** 保存用hashの作成と照合。失敗はrejectで伝え、入力値やhashをログへ出力しない。 */
export interface PasswordOperations {
  /** 検証済みの平文から保存用hashを返す。呼び出し元は平文を保存しない。 */
  hashPassword(password: string): Promise<string>;
  /** 検証済みの平文と保存済みhashを照合し、一致する場合だけtrueを返す。 */
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
}
