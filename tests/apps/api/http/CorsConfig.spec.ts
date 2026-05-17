import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("apps/api CORS config", () => {
  it("allows browser preflight for PATCH request updates", () => {
    const serverSource = readFileSync("apps/api/src/presentation/http/server.ts", "utf8");

    expect(serverSource).toContain('methods: ["GET", "HEAD", "POST", "PATCH"]');
  });
});
