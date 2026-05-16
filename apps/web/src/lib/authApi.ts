import type { AuthMeDto, AuthUserDto, CsrfTokenDto, LoginInput, RegisterInput } from "@miniflow/shared";

let csrfTokenCache: string | null = null;

/**
 * Auth transport is centralized here so UI components do not manage cookie or csrf details.
 */
export async function register(apiBaseUrl: string, input: RegisterInput): Promise<AuthUserDto> {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include"
  });

  const payload = await parseResponse<{ user: AuthUserDto }>(response);
  return payload.user;
}

export async function login(apiBaseUrl: string, input: LoginInput): Promise<AuthUserDto> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include"
  });

  const payload = await parseResponse<{ user: AuthUserDto }>(response);
  const csrf = await fetchCsrfToken(apiBaseUrl);
  csrfTokenCache = csrf.csrfToken;
  return payload.user;
}

export async function logout(apiBaseUrl: string): Promise<void> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers
  });

  if (!response.ok && response.status !== 204) {
    await parseResponse(response);
  }

  csrfTokenCache = null;
}

export async function fetchCurrentUser(apiBaseUrl: string): Promise<AuthMeDto | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    credentials: "include",
    cache: "no-store"
  });

  if (response.status === 401) {
    return null;
  }

  return parseResponse<AuthMeDto>(response);
}

export async function csrfHeaders(apiBaseUrl: string): Promise<Record<string, string>> {
  if (!csrfTokenCache) {
    const csrf = await fetchCsrfToken(apiBaseUrl);
    csrfTokenCache = csrf.csrfToken;
  }

  return {
    "x-csrf-token": csrfTokenCache
  };
}

async function fetchCsrfToken(apiBaseUrl: string): Promise<CsrfTokenDto> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
    cache: "no-store"
  });

  return parseResponse<CsrfTokenDto>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? `API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
