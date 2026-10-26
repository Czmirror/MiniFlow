/** cookieの署名・期限・認証世代と現在の有効ユーザーを照合し、HTTPへ安全なactor情報を渡す。 */
import { verifyCsrfToken } from "../../../infrastructure/auth/csrf.js";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRepository } from "../../../application/ports/UserRepository.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from "../../../infrastructure/auth/jwt.js";
import { getCurrentUser } from "../../../application/auth/GetCurrentUser.js";

declare module "fastify" {
  interface FastifyRequest {
    /** JWT署名確認後だけ設定するログイン識別子。認可用DTOには公開しない。 */
    sessionId: string | null;
    currentUser: {
      id: string;
      email: string;
      displayName: string | null;
      language: "ja" | "en";
      teamId: string;
      role: "Applicant" | "Approver" | "Admin";
      isActive: boolean;
    } | null;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireCsrf: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Auth transport concerns stay in this plugin so workflow routes only depend on currentUser.
 */
export const authPlugin = fp(async function authPlugin(server, options: { userRepository: UserRepository; csrfSecret: string }) {
  server.decorateRequest("currentUser", null);
  server.decorateRequest("sessionId", null);

  server.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.cookies[AUTH_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }

      let payload: { sub: string; sv: number; exp: number; sid: string };
      try {
        payload = await request.jwtVerify<typeof payload>({ onlyCookie: true });
      } catch {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }
      if (!payload || typeof payload !== "object" || typeof payload.sid !== "string" || !/^[a-f0-9-]{36}$/.test(payload.sid) || typeof payload.sub !== "string" || !Number.isSafeInteger(payload.sv) || payload.sv < 0 || !Number.isFinite(payload.exp)) {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }
      const user = await getCurrentUser(options.userRepository, payload.sub);
      if (!user || !user.isActive || user.sessionVersion !== payload.sv) {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }

      request.sessionId = payload.sid;
      request.currentUser = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        language: user.language,
        teamId: user.teamId,
        role: user.role,
        isActive: user.isActive
      };
    } catch {
      return reply.code(500).send(authError("INTERNAL_SERVER_ERROR", "authentication unavailable", 500));
    }
  });

  server.decorate("requireCsrf", async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    const headerToken = request.headers["x-csrf-token"];

    if (!request.sessionId || !verifyCsrfToken(options.csrfSecret, request.sessionId, cookieToken) || !verifyCsrfToken(options.csrfSecret, request.sessionId, headerToken)) {
      return reply.code(403).send(authError("FORBIDDEN", "invalid csrf token", 403));
    }
  });
});

function authError(code: string, message: string, status: number) {
  return {
    error: {
      code,
      message,
      status
    }
  };
}
