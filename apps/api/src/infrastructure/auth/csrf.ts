/** JWTで署名されたログイン識別子にCSRF tokenを結び付ける。cookie/headerの自己一致だけを信用しない。 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** 同じsessionと鍵から同じtokenを返す。JWT署名と用途を区別するため固定prefixを含める。 */
export function createCsrfToken(secret: string, sessionId: string): string {
  return createHmac("sha256", secret).update(`miniflow:csrf:v1:${sessionId}`).digest("hex");
}

/** 固定長の署名形式を検査し、現在sessionに対応する値と定時間で照合する。 */
export function verifyCsrfToken(secret: string, sessionId: string, token: unknown): boolean {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(createCsrfToken(secret, sessionId), "hex"));
}
