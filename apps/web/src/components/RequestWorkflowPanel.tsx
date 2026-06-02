"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { ApprovalDto, RequestDetailDto, RequestDto } from "@miniflow/shared";
import {
  getRequest,
  listRequests,
  transitionRequest,
  updateRequest
} from "../lib/requestApi";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const defaultTeamId = "team-1";

/**
 * This panel is intentionally broad rather than split into many components so
 * the current workflow can be inspected in one place while the UI is still MVP-sized.
 */
export function RequestWorkflowPanel() {
  const [teamId] = useState(defaultTeamId);
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<RequestDto | null>(null);
  const [approvals, setApprovals] = useState<ApprovalDto[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [decisionReason, setDecisionReason] = useState("Approved from UI");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedStatus = selectedRequest?.status;
  const canUpdate = selectedStatus === "Draft";
  const canSubmit = selectedStatus === "Draft";
  const canApprove = selectedStatus === "Pending";
  const canReject = selectedStatus === "Pending";
  const canRevise = selectedStatus === "Rejected";
  const canDelete = selectedStatus === "Draft" || selectedStatus === "Rejected";

  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    if (!selectedRequest) {
      setTitle("");
      setBody("");
      return;
    }

    setTitle(selectedRequest.title);
    setBody(selectedRequest.body);
  }, [selectedRequest]);

  const summary = useMemo(() => {
    if (!selectedRequest) {
      return "Select a request to inspect or operate on it.";
    }

    return `${selectedRequest.id} / ${selectedRequest.status}`;
  }, [selectedRequest]);

  async function refreshList() {
    setLoading(true);
    setError(null);

    try {
      const response = await listRequests(apiBaseUrl, true);
      setRequests(response.items);

      if (!selectedId && response.items[0]) {
        setSelectedId(response.items[0].id);
        setSelectedRequest(response.items[0]);
        setApprovals([]);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    setLoading(true);
    setError(null);

    try {
      const detail = await getRequest(apiBaseUrl, id);
      setSelectedRequest(detail.request);
      setApprovals(detail.approvals);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = await updateRequest(apiBaseUrl, selectedRequest.id, { title, body });
      await syncSelectedRequest(request);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(action: "submit" | "approve" | "reject" | "revise" | "delete") {
    if (!selectedRequest) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = await transitionRequest(
        apiBaseUrl,
        selectedRequest.id,
        action,
        action === "approve" || action === "reject" ? { reason: decisionReason } : undefined
      );
      await syncSelectedRequest(request);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function syncSelectedRequest(request: RequestDto) {
    setSelectedRequest(request);
    setSelectedId(request.id);
    const detail = await getRequest(apiBaseUrl, request.id);
    setApprovals(detail.approvals);
    const response = await listRequests(apiBaseUrl, true);
    setRequests(response.items);
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ marginBottom: "0.75rem", fontSize: "1.25rem" }}>Inspect and transition requests</h2>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Team ID</span>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input value={teamId} readOnly style={inputStyle} />
            <button type="button" onClick={() => void refreshList()} disabled={loading} style={secondaryButtonStyle}>
              {loading ? "Loading..." : "GET /requests 実行"}
            </button>
          </div>
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Requests</span>
          <select value={selectedId} onChange={(event) => void handleSelect(event.target.value)} style={inputStyle}>
            <option value="">Select a request</option>
            {requests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.status} | {request.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={panelStyle}>
        <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "#52606d" }}>{summary}</p>
        {selectedRequest ? <pre style={{ margin: 0 }}>{JSON.stringify(selectedRequest, null, 2)}</pre> : null}
        {error ? <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "#b42318" }}>{error}</p> : null}
      </div>

      <div style={panelStyle}>
        <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "#52606d" }}>Approvals history</p>
        {selectedRequest ? (
          approvals.length > 0 ? (
            <pre style={{ margin: 0 }}>{JSON.stringify(approvals, null, 2)}</pre>
          ) : (
            <p style={{ margin: 0, color: "#52606d" }}>No approvals yet.</p>
          )
        ) : (
          <p style={{ margin: 0, color: "#52606d" }}>Select a request to load approval history.</p>
        )}
      </div>

      <form onSubmit={handleUpdate} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} disabled={!selectedRequest} />
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Body</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            disabled={!selectedRequest}
          />
        </label>

        <button type="submit" disabled={!canUpdate || loading} style={secondaryButtonStyle}>
          PATCH /requests/:id 実行
        </button>
      </form>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Decision reason</span>
          <input
            value={decisionReason}
            onChange={(event) => setDecisionReason(event.target.value)}
            style={inputStyle}
            disabled={!selectedRequest}
          />
        </label>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" onClick={() => void handleTransition("submit")} disabled={!canSubmit || loading} style={secondaryButtonStyle}>
            submit
          </button>
          <button type="button" onClick={() => void handleTransition("approve")} disabled={!canApprove || loading} style={secondaryButtonStyle}>
            approve
          </button>
          <button type="button" onClick={() => void handleTransition("reject")} disabled={!canReject || loading} style={secondaryButtonStyle}>
            reject
          </button>
          <button type="button" onClick={() => void handleTransition("revise")} disabled={!canRevise || loading} style={secondaryButtonStyle}>
            revise
          </button>
          <button type="button" onClick={() => void handleTransition("delete")} disabled={!canDelete || loading} style={dangerButtonStyle}>
            delete
          </button>
        </div>
      </div>
    </section>
  );
}

const panelStyle: CSSProperties = {
  marginTop: "1rem",
  minHeight: "120px",
  borderRadius: "16px",
  background: "#f8fafb",
  padding: "1rem",
  border: "1px solid rgba(31,41,51,0.08)"
};

const inputStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(31,41,51,0.18)",
  padding: "0.75rem 0.9rem",
  font: "inherit",
  background: "#fff"
};

const secondaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: "999px",
  background: "#1f2933",
  color: "#f4f1e8",
  padding: "0.85rem 1.2rem",
  cursor: "pointer"
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  background: "#b42318"
};
