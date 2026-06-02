import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("apps/api team boundary routes", () => {
  it("derives request team from the authenticated user instead of client input", () => {
    const source = readFileSync("apps/api/src/presentation/http/routes/requests.ts", "utf8");

    expect(source).toContain("teamId: request.currentUser.teamId");
    expect(source).not.toContain("teamId: body.teamId ??");
    expect(source).not.toContain("teamId: query.teamId ??");
  });

  it("requires auth and current-team ownership for request detail and mutations", () => {
    const source = readFileSync("apps/api/src/presentation/http/routes/requests.ts", "utf8");

    expect(source).toContain('server.get("/requests/:id", { preHandler: [server.requireAuth] }');
    expect(source).toContain("ensureRequestBelongsToCurrentTeam");
    expect(source).toContain('throw new AuthorizationError("request belongs to another team")');
  });

  it("limits request edit, revise, and delete operations to requester or admin", () => {
    const source = readFileSync("apps/api/src/presentation/http/routes/requests.ts", "utf8");

    expect(source).toContain("ensureRequesterOrAdmin");
    expect(source).toContain('throw new AuthorizationError("request edits are only allowed by requester or admin")');
  });

  it("keeps user team assignment behind admin-only user management", () => {
    const source = readFileSync("apps/api/src/presentation/http/routes/auth.ts", "utf8");
    const registerRoute = source.slice(
      source.indexOf('server.post("/auth/register"'),
      source.indexOf('server.post("/auth/login"')
    );

    expect(registerRoute).toContain('teamId: "team-1"');
    expect(registerRoute).not.toContain("teamId: body.teamId");
    expect(source).toContain('request.currentUser.role !== "Admin"');
    expect(source).toContain("user management requires admin role");
  });
});
