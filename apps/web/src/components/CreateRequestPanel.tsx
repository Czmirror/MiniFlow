"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { CreateRequestInput, RequestDto } from "@miniflow/shared";
import { createRequest } from "../lib/createRequest";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const initialForm: CreateRequestInput = {
  teamId: "team-1",
  title: "Week 2 draft",
  body: "Create the first request through the API."
};

export function CreateRequestPanel() {
  const [form, setForm] = useState<CreateRequestInput>(initialForm);
  const [createdRequest, setCreatedRequest] = useState<RequestDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await createRequest(apiBaseUrl, form);
      setCreatedRequest(response);
    } catch (caughtError) {
      setCreatedRequest(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ marginBottom: "0.75rem", fontSize: "1.25rem" }}>Create draft request</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Team ID</span>
          <input
            value={form.teamId}
            onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Title</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Body</span>
          <textarea
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            borderRadius: "999px",
            background: "#0b6e4f",
            color: "#f4f1e8",
            padding: "0.9rem 1.4rem",
            cursor: loading ? "wait" : "pointer",
            justifySelf: "start"
          }}
        >
          {loading ? "Creating..." : "POST /requests 実行"}
        </button>
      </form>

      <div
        style={{
          marginTop: "1rem",
          minHeight: "120px",
          borderRadius: "16px",
          background: "#f8fafb",
          padding: "1rem",
          border: "1px solid rgba(31,41,51,0.08)"
        }}
      >
        {createdRequest ? <pre style={{ margin: 0 }}>{JSON.stringify(createdRequest, null, 2)}</pre> : null}
        {error ? <p style={{ margin: 0, color: "#b42318" }}>{error}</p> : null}
        {!createdRequest && !error ? (
          <p style={{ margin: 0, color: "#52606d" }}>Draft request response will appear here.</p>
        ) : null}
      </div>
    </section>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(31,41,51,0.18)",
  padding: "0.75rem 0.9rem",
  font: "inherit",
  background: "#fff"
};
