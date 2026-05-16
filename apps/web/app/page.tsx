import { AuthPanel } from "../src/components/AuthPanel";
import { CreateRequestPanel } from "../src/components/CreateRequestPanel";
import { HealthCheckPanel } from "../src/components/HealthCheckPanel";
import { RequestWorkflowPanel } from "../src/components/RequestWorkflowPanel";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem"
      }}
    >
      <section
        style={{
          width: "min(880px, 100%)",
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(31,41,51,0.08)",
          borderRadius: "24px",
          padding: "2rem",
          boxShadow: "0 24px 80px rgba(31,41,51,0.12)"
        }}
      >
        <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Week 1
        </p>
        <h1 style={{ marginTop: "0.5rem", marginBottom: "0.5rem", fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
          MiniFlow
        </h1>
        <p style={{ marginTop: 0, marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Local health check, cookie-based auth, and request workflow verification for the API and PostgreSQL connection.
        </p>

        <HealthCheckPanel />
        <AuthPanel />
        <CreateRequestPanel />
        <RequestWorkflowPanel />
      </section>
    </main>
  );
}
