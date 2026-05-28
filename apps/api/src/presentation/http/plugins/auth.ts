import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRepository } from "../../../application/ports/UserRepository.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from "../../../infrastructure/auth/jwt.js";
import { getCurrentUser } from "../../../application/auth/GetCurrentUser.js";

declare module "fastify" {
  interface FastifyRequest {
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
export const authPlugin = fp(async function authPlugin(server, options: { userRepository: UserRepository }) {
  server.decorateRequest("currentUser", null);

  server.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.cookies[AUTH_COOKIE_NAME];
      if (!token) {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }

      const payload = await request.jwtVerify<{ sub: string }>({ onlyCookie: true });
      const user = await getCurrentUser(options.userRepository, payload.sub);
      if (!user || !user.isActive) {
        return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
      }

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
      return reply.code(401).send(authError("UNAUTHORIZED", "authentication required", 401));
    }
  });

  server.decorate("requireCsrf", async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    const headerToken = request.headers["x-csrf-token"];

    if (!cookieToken || typeof headerToken !== "string" || headerToken !== cookieToken) {
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
