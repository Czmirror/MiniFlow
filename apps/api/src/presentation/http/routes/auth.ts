import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { InputValidationError } from "../../../application/errors/InputValidationError.js";
import { StateConflictError } from "../../../application/errors/StateConflictError.js";
import { loginUser } from "../../../application/auth/LoginUser.js";
import { registerUser } from "../../../application/auth/RegisterUser.js";
import { createCsrfToken } from "../../../infrastructure/auth/csrf.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from "../../../infrastructure/auth/jwt.js";
import { PrismaUserRepository } from "../../../infrastructure/repositories/PrismaUserRepository.js";

/**
 * Auth routes own cookie issuance and csrf token setup. Keep workflow routes free from these concerns.
 */
export function registerAuthRoutes(server: FastifyInstance, prisma: PrismaClient) {
  const repository = new PrismaUserRepository(prisma);

  server.post("/auth/register", async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{ email: string; password: string }>;

    try {
      const user = await registerUser(repository, {
        email: body.email ?? "",
        password: body.password ?? ""
      });

      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      return handleAuthError(reply, error, "failed to register");
    }
  });

  server.post("/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{ email: string; password: string }>;

    try {
      const user = await loginUser(repository, {
        email: body.email ?? "",
        password: body.password ?? ""
      });

      const csrfToken = createCsrfToken();
      const jwt = await reply.jwtSign({ sub: user.id, email: user.email });

      setAuthCookies(reply, jwt, csrfToken);

      return reply.send({
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      return handleAuthError(reply, error, "failed to login");
    }
  });

  server.post("/auth/logout", { preHandler: [server.requireAuth, server.requireCsrf] }, async (_request, reply) => {
    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  server.get("/auth/csrf", { preHandler: [server.requireAuth] }, async (_request, reply) => {
    const csrfToken = createCsrfToken();
    reply.setCookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
    return reply.send({ csrfToken });
  });

  server.get("/auth/me", { preHandler: [server.requireAuth] }, async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send(unauthorized());
    }

    return reply.send(request.currentUser);
  });
}

function setAuthCookies(reply: import("fastify").FastifyReply, jwt: string, csrfToken: string) {
  reply.setCookie(AUTH_COOKIE_NAME, jwt, authCookieOptions());
  reply.setCookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
}

function clearAuthCookies(reply: import("fastify").FastifyReply) {
  reply.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
  reply.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions());
}

function authCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function csrfCookieOptions() {
  return {
    path: "/",
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function handleAuthError(reply: import("fastify").FastifyReply, error: unknown, fallbackMessage: string) {
  if (error instanceof InputValidationError) {
    return reply.code(error.statusCode).send({
      error: {
        code: "INVALID_INPUT",
        message: error.message,
        status: error.statusCode
      }
    });
  }

  if (error instanceof StateConflictError) {
    return reply.code(error.statusCode).send({
      error: {
        code: "STATE_CONFLICT",
        message: error.message,
        status: error.statusCode
      }
    });
  }

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: fallbackMessage,
      status: 500
    }
  });
}

function unauthorized() {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "authentication required",
      status: 401
    }
  };
}
