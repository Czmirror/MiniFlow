/** WebのAPI応答とCSRFヘッダーを扱う。401では保持中のCSRF tokenを破棄し、画面へHTTP statusを渡す。 */
import type { CsrfTokenDto } from "@miniflow/shared";

// このブラウザのログイン中だけ保持する。401・ログアウト・password変更時に破棄する。
let csrfTokenCache: string | null = null;

/** APIの失敗をHTTP status付きで伝える。通信失敗は元の例外として扱う。 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** 現在の認証に対応するCSRF tokenを忘れ、次回はAPIから取得する。 */
export function clearCsrfToken(): void {
  csrfTokenCache = null;
}

/** cookie認証の更新要求に必要なCSRF tokenを取得・保持する。失敗時は送信を続けない。 */
export async function csrfHeaders(apiBaseUrl: string): Promise<Record<string, string>> {
  if (!csrfTokenCache) {
    const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
      credentials: "include",
      cache: "no-store"
    });
    const csrf = await parseResponse<CsrfTokenDto>(response);
    csrfTokenCache = csrf.csrfToken;
  }
  return { "x-csrf-token": csrfTokenCache };
}

/** JSON応答を読み、失敗はstatus付きの例外にする。401は応答本文が壊れていても認証失効として扱う。 */
export async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) clearCsrfToken();
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(payload?.error?.message ?? `API request failed with status ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}
