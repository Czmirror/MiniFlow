/** WebのAPI応答とCSRFヘッダーを扱う。401では未完了のCSRF取得を無効化し、画面へHTTP statusを渡す。 */
import type { CsrfTokenDto } from "@miniflow/shared";

// 未完了の同時取得だけを共有する。完了tokenを長期保持せず、別タブの再ログインにも追随する。
let csrfRequest: { baseUrl: string; generation: number; promise: Promise<string> } | null = null;
let sessionGeneration = 0;

/** APIの失敗をHTTP status付きで伝える。通信失敗は元の例外として扱う。 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** 現在の認証に対応する未完了のCSRF取得を無効化する。 */
export function clearCsrfToken(): void {
  sessionGeneration++;
  csrfRequest = null;
}

/** cookie認証の更新要求に必要なCSRF tokenを更新前に取得する。失敗時は送信を続けない。 */
export async function csrfHeaders(apiBaseUrl: string): Promise<Record<string, string>> {
  const generation = sessionGeneration;
  let pending = csrfRequest;
  if (!pending || pending.baseUrl !== apiBaseUrl || pending.generation !== generation) {
    const promise = fetch(`${apiBaseUrl}/auth/csrf`, { credentials: "include", cache: "no-store" })
      .then(response => parseResponse<CsrfTokenDto>(response)).then(csrf => csrf.csrfToken);
    pending = { baseUrl: apiBaseUrl, generation, promise };
    csrfRequest = pending;
  }
  try {
    const token = await pending.promise;
    // logoutや401のあとに古い取得が完了しても、その値で更新要求を送らない。
    if (generation !== sessionGeneration) throw new ApiError("authentication changed; log in again", 401);
    return { "x-csrf-token": token };
  } finally {
    if (csrfRequest === pending) csrfRequest = null;
  }
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
