import { describe, expect, it } from "vitest";
import { Request } from "../../../src/domain/request/Request";

describe("T01 Draft -> submit -> Pending", () => {
  it("submitでPendingに遷移する", () => {
    const request = new Request();

    request.submit();

    expect(request.status).toBe("Pending");
  });
});
