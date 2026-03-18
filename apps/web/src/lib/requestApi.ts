import type { CreateRequestInput, ListRequestsResponse, RequestDetailDto, RequestDto } from "@miniflow/shared";

/**
 * Keep HTTP details here so UI components can stay focused on user state.
 * If auth headers are introduced later, this module is the first place to update.
 */
export async function createRequest(apiBaseUrl: string, input: CreateRequestInput): Promise<RequestDto> {
  const response = await fetch(`${apiBaseUrl}/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  return parseResponse<RequestDto>(response);
}

export async function listRequests(apiBaseUrl: string, teamId: string, includeDeleted = true): Promise<ListRequestsResponse> {
  const params = new URLSearchParams({ teamId, includeDeleted: String(includeDeleted) });
  const response = await fetch(`${apiBaseUrl}/requests?${params.toString()}`, {
    cache: "no-store"
  });

  return parseResponse<ListRequestsResponse>(response);
}

export async function getRequest(apiBaseUrl: string, id: string): Promise<RequestDetailDto> {
  const response = await fetch(`${apiBaseUrl}/requests/${id}`, {
    cache: "no-store"
  });

  return parseResponse<RequestDetailDto>(response);
}

export async function updateRequest(apiBaseUrl: string, id: string, input: { title?: string; body?: string }): Promise<RequestDto> {
  const response = await fetch(`${apiBaseUrl}/requests/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  return parseResponse<RequestDto>(response);
}

export async function transitionRequest(
  apiBaseUrl: string,
  id: string,
  action: "submit" | "approve" | "reject" | "revise" | "delete",
  body?: { reason?: string }
): Promise<RequestDto> {
  const response = await fetch(`${apiBaseUrl}/requests/${id}/${action}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  return parseResponse<RequestDto>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message ?? `API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
