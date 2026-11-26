/** 本番の転送先選択を検証する。未指定の互換性と、任意URL/未知指定の拒否を確認し、通信は行わない。 */
import { describe, expect, it } from "vitest";
import { resolveApiProxyDestination } from "../../../apps/web/src/config/apiProxy";

describe("固定API転送先", () => {
  it("未指定とcomposeは従来先、railwayだけ専用内部先にする", () => {
    expect(resolveApiProxyDestination(undefined)).toBe("http://api:3001");
    expect(resolveApiProxyDestination("compose")).toBe("http://api:3001");
    expect(resolveApiProxyDestination("railway")).toBe("http://api.railway.internal:3001");
  });
  it.each(["", "unknown", "Railway", " railway", "railway ", "https://untrusted.example.test", "http://127.0.0.1:3001"])("未知指定を拒否する: %s", target => {
    expect(() => resolveApiProxyDestination(target)).toThrowError(/^MINIFLOW_DEPLOY_TARGET must be compose or railway$/);
  });
});
