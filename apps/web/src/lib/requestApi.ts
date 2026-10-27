import type { CreateRequestInput, ListRequestsResponse, RequestDetailDto, RequestDto, RequestSummary, RequestListScope, RequestStatus } from "@miniflow/shared";
import { csrfHeaders, parseResponse } from "./apiTransport";

/**
 * Keep HTTP details here so UI components can stay focused on user state.
 * If auth transport changes later, update this module before touching UI components.
 */
export async function createRequest(apiBaseUrl: string, input: CreateRequestInput): Promise<RequestDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "include"
  });

  return parseResponse<RequestDto>(response);
}

export async function listRequests(apiBaseUrl: string, includeDeleted = true, options: { scope?: RequestListScope; page?: number; limit?: number; status?: RequestStatus } = {}): Promise<ListRequestsResponse> {
  const params = new URLSearchParams({ includeDeleted: String(includeDeleted) });
  if (options.status) params.set("status", options.status);
  if (options.scope) params.set("scope", options.scope);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  const response = await fetch(`${apiBaseUrl}/requests?${params.toString()}`, {
    cache: "no-store",
    credentials: "include"
  });

  return parseResponse<ListRequestsResponse>(response);
}

export async function getRequest(apiBaseUrl: string, id: string): Promise<RequestDetailDto> {
  const response = await fetch(`${apiBaseUrl}/requests/${id}`, {
    cache: "no-store",
    credentials: "include"
  });

  return parseResponse<RequestDetailDto>(response);
}

export async function updateRequest(apiBaseUrl: string, id: string, input: { title?: string; body?: string }): Promise<RequestDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/requests/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "include"
  });

  return parseResponse<RequestDto>(response);
}

export async function transitionRequest(
  apiBaseUrl: string,
  id: string,
  action: "submit" | "approve" | "reject" | "revise" | "delete",
  body?: { reason?: string }
): Promise<RequestDto> {
  const headers = await csrfHeaders(apiBaseUrl);
  const response = await fetch(`${apiBaseUrl}/requests/${id}/${action}`, {
    method: "POST",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "include"
  });

  return parseResponse<RequestDto>(response);
}

/** チーム全体の集計を取得する。本人とチームはサーバーが認証情報から解決する。 */
export async function fetchRequestSummary(apiBaseUrl: string): Promise<RequestSummary> {
  return parseResponse<RequestSummary>(await fetch(`${apiBaseUrl}/requests/summary`, { cache: "no-store", credentials: "include" }));
}
