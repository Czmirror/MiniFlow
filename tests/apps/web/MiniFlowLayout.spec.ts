import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("apps/web MiniFlow layout", () => {
  it("renders the sidebar title from the active view", () => {
    const source = readFileSync("apps/web/src/components/MiniFlowApp.tsx", "utf8");

    expect(source).toContain("const currentPageTitle =");
    expect(source).toMatch(/view === "detail"\s*\?\s*labels\.requestDetail/);
    expect(source).toContain("<h1>{currentPageTitle}</h1>");
  });

  it("keeps the shared layout free of the old top-right team and refresh controls", () => {
    const source = readFileSync("apps/web/src/components/MiniFlowApp.tsx", "utf8");

    expect(source).not.toContain('className="team-control readonly"');
    expect(source).not.toContain('className="topbar"');
    expect(source).not.toContain("handleRefresh");
  });

  it("shows team as read-only in the request create form", () => {
    const source = readFileSync("apps/web/src/components/MiniFlowApp.tsx", "utf8");

    expect(source).toContain('className="field readonly-field"');
    expect(source).not.toContain('onChange={(event) => setTeamId(event.target.value)}');
  });

  it("offers requester actions for rejected and draft request details", () => {
    const source = readFileSync("apps/web/src/components/MiniFlowApp.tsx", "utf8");

    expect(source).toContain("const canRevise =");
    expect(source).toContain('request.status === "Rejected"');
    expect(source).toContain("onReviseRequest");
    expect(source).toContain("onUpdateRequest");
  });
});
