"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { AuthUserDto } from "@miniflow/shared";
import { fetchCurrentUser, login, logout, register } from "../lib/authApi";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

/**
 * Auth UI remains intentionally simple. Once navigation or separate screens exist,
 * split register/login/me into dedicated components.
 */
export function AuthPanel() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password1234");
  const [currentUser, setCurrentUser] = useState<AuthUserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    setLoading(true);
    setError(null);

    try {
      const user = await fetchCurrentUser(apiBaseUrl);
      setCurrentUser(user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register(apiBaseUrl, { email, password });
      const user = await login(apiBaseUrl, { email, password });
      setCurrentUser(user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setLoading(true);
    setError(null);

    try {
      const user = await login(apiBaseUrl, { email, password });
      setCurrentUser(user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError(null);

    try {
      await logout(apiBaseUrl);
      setCurrentUser(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ marginBottom: "0.75rem", fontSize: "1.25rem" }}>Auth</h2>
      <form onSubmit={handleRegister} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="submit" disabled={loading} style={buttonStyle}>register + login</button>
          <button type="button" disabled={loading} onClick={() => void handleLogin()} style={buttonStyle}>login</button>
          <button type="button" disabled={loading} onClick={() => void handleLogout()} style={dangerButtonStyle}>logout</button>
          <button type="button" disabled={loading} onClick={() => void loadCurrentUser()} style={buttonStyle}>GET /auth/me</button>
        </div>
      </form>
      <div style={panelStyle}>
        {currentUser ? <pre style={{ margin: 0 }}>{JSON.stringify(currentUser, null, 2)}</pre> : <p style={{ margin: 0, color: "#52606d" }}>No authenticated user.</p>}
        {error ? <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "#b42318" }}>{error}</p> : null}
      </div>
    </section>
  );
}

const panelStyle: CSSProperties = {
  marginTop: "1rem",
  minHeight: "96px",
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

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: "999px",
  background: "#1f2933",
  color: "#f4f1e8",
  padding: "0.85rem 1.2rem",
  cursor: "pointer"
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#b42318"
};
