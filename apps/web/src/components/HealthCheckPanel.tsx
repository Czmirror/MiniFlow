"use client";

import { useState } from "react";
import type { HealthResponse } from "@miniflow/shared";
import { fetchHealth } from "../lib/fetchHealth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function HealthCheckPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchHealth(apiBaseUrl);
      setHealth(response);
    } catch (caughtError) {
      setHealth(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          border: 0,
          borderRadius: "999px",
          background: "#1f2933",
          color: "#f4f1e8",
          padding: "0.9rem 1.4rem",
          cursor: loading ? "wait" : "pointer"
        }}
      >
        {loading ? "Checking..." : "API health check 実行"}
      </button>

      <div
        style={{
          marginTop: "1.5rem",
          minHeight: "120px",
          borderRadius: "16px",
          background: "#f8fafb",
          padding: "1rem",
          border: "1px solid rgba(31,41,51,0.08)"
        }}
      >
        {health ? <pre style={{ margin: 0 }}>{JSON.stringify(health, null, 2)}</pre> : null}
        {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
        {!health && !error ? (
          <p style={{ margin: 0, color: "#52606d" }}>Result will appear here. API base URL: {apiBaseUrl}</p>
        ) : null}
      </div>
    </>
  );
}
