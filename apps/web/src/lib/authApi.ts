import type {
  AuthMeDto,
  AuthUserDto,
  ChangePasswordInput,
  CreateUserInput,
  CsrfTokenDto,
  LoginInput,
  RegisterInput,
  UpdateAccountInput,
  UpdateUserInput,
  UserManagementDto
} from "@miniflow/shared";

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

export async function updateAccount(apiBaseUrl: string, input: UpdateAccountInput): Promise<AuthUserDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/account`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    credentials: "include"
  });

  return parseResponse<AuthUserDto>(response);
}

export async function changePassword(apiBaseUrl: string, input: ChangePasswordInput): Promise<AuthUserDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/account/password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    credentials: "include"
  });

  return parseResponse<AuthUserDto>(response);
}

export async function listUsers(apiBaseUrl: string): Promise<{ items: UserManagementDto[] }> {
  const response = await fetch(`${apiBaseUrl}/users`, {
    credentials: "include",
    cache: "no-store"
  });

  return parseResponse<{ items: UserManagementDto[] }>(response);
}

export async function createUser(apiBaseUrl: string, input: CreateUserInput): Promise<UserManagementDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    credentials: "include"
  });

  return parseResponse<UserManagementDto>(response);
}

export async function updateUser(apiBaseUrl: string, id: string, input: UpdateUserInput): Promise<UserManagementDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/users/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    credentials: "include"
  });

  return parseResponse<UserManagementDto>(response);
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
