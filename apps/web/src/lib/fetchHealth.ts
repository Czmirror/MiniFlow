import type { HealthResponse } from "@miniflow/shared";

export async function fetchHealth(apiBaseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
