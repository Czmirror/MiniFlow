import type { CreateRequestInput, RequestDto } from "@miniflow/shared";

export async function createRequest(apiBaseUrl: string, input: CreateRequestInput): Promise<RequestDto> {
  const response = await fetch(`${apiBaseUrl}/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(payload?.error?.message ?? `API request failed with status ${response.status}`);
  }

  return (await response.json()) as RequestDto;
}
