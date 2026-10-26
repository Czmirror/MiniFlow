/** 認証・アカウント・管理者APIを呼ぶ。HTTP応答とCSRFの保持はapiTransportへ委ねる。 */
import type {
  AuthMeDto,
  AuthUserDto,
  ChangePasswordInput,
  CreateUserInput,
  LoginInput,
  UpdateAccountInput,
  UpdateUserInput,
  UserManagementDto
} from "@miniflow/shared";

import { clearCsrfToken, csrfHeaders, parseResponse } from "./apiTransport";

/**
 * Auth transport is centralized here so UI components do not manage cookie or csrf details.
 */
export async function login(apiBaseUrl: string, input: LoginInput): Promise<AuthUserDto> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include"
  });

  const payload = await parseResponse<{ user: AuthUserDto }>(response);
  clearCsrfToken();
  await csrfHeaders(apiBaseUrl);
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

  clearCsrfToken();
}

export async function fetchCurrentUser(apiBaseUrl: string): Promise<AuthMeDto | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    credentials: "include",
    cache: "no-store"
  });

  if (response.status === 401) {
    clearCsrfToken();
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

  const user = await parseResponse<AuthUserDto>(response);
  clearCsrfToken();
  return user;
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
