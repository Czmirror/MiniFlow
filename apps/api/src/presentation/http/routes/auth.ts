/** 認証・管理者のユーザー操作をHTTPへ公開する。公開signupは提供しない。 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { PasswordOperations } from "../../../application/ports/PasswordOperations.js";
import type { UserRepository } from "../../../application/ports/UserRepository.js";
import { InputValidationError } from "../../../application/errors/InputValidationError.js";
import { StateConflictError } from "../../../domain/errors/StateConflictError.js";
import { AuthorizationError } from "../../../application/errors/AuthorizationError.js";
import { loginUser } from "../../../application/auth/LoginUser.js";
import { registerUser } from "../../../application/auth/RegisterUser.js";
import { changePassword } from "../../../application/auth/ChangePassword.js";
import { listUsers } from "../../../application/auth/ListUsers.js";
import { updateAccount } from "../../../application/auth/UpdateAccount.js";
import { updateUser } from "../../../application/auth/UpdateUser.js";
import { createCsrfToken } from "../../../infrastructure/auth/csrf.js";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, SESSION_TTL_SECONDS } from "../../../infrastructure/auth/jwt.js";
import { loginSchema, accountSchema, passwordSchema, createUserSchema, userUpdateSchema } from "../validation/schemas.js";

/**
 * 認証cookieとCSRF tokenを発行する。暗号操作は組立から受け取り、認証usecaseへ渡す。
 */
export function registerAuthRoutes(server: FastifyInstance, repository: UserRepository, csrfSecret: string, passwords: PasswordOperations) {
  server.post("/auth/login", { schema: loginSchema }, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{ email: string; password: string }>;

    try {
      const user = await loginUser(repository, {
        email: body.email ?? "",
        password: body.password ?? ""
      }, passwords);

      const sid = randomUUID();
      const csrfToken = createCsrfToken(csrfSecret, sid);
      const jwt = await reply.jwtSign({ sub: user.id, sv: user.sessionVersion, sid });

      setAuthCookies(reply, jwt, csrfToken);

      return reply.send({
        user: toAuthUserDto(user)
      });
    } catch (error) {
      return handleAuthError(reply, error, "failed to login");
    }
  });

  server.post("/auth/logout", { preHandler: [server.requireAuth, server.requireCsrf] }, async (_request, reply) => {
    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  server.get("/auth/csrf", { preHandler: [server.requireAuth] }, async (request, reply) => {
    // 認証pluginが署名を検証した識別子だけを使い、GETで共有cookieを更新しない。
    if (!request.sessionId) return reply.code(401).send(unauthorized());
    const csrfToken = createCsrfToken(csrfSecret, request.sessionId);
    return reply.header("Cache-Control", "no-store").send({ csrfToken });
  });

  server.get("/auth/me", { preHandler: [server.requireAuth] }, async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send(unauthorized());
    }

    return reply.send(request.currentUser);
  });

  server.patch("/account", { schema: accountSchema, preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{ displayName: string | null; language: "ja" | "en" }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(unauthorized());
      }

      const user = await updateAccount(repository, {
        userId: request.currentUser.id,
        displayName: body.displayName,
        language: body.language
      });

      if (!user) {
        return reply.code(404).send(notFound("user not found"));
      }

      return reply.send(toAuthUserDto(user));
    } catch (error) {
      return handleAuthError(reply, error, "failed to update account");
    }
  });

  server.post("/account/password", { schema: passwordSchema, preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{ currentPassword: string; newPassword: string }>;

    try {
      if (!request.currentUser) {
        return reply.code(401).send(unauthorized());
      }

      const user = await changePassword(repository, {
        userId: request.currentUser.id,
        currentPassword: body.currentPassword ?? "",
        newPassword: body.newPassword ?? ""
      }, passwords);

      if (!user) {
        return reply.code(404).send(notFound("user not found"));
      }

      clearAuthCookies(reply);
      return reply.send(toAuthUserDto(user));
    } catch (error) {
      return handleAuthError(reply, error, "failed to change password");
    }
  });

  server.get("/users", { preHandler: [server.requireAuth] }, async (request, reply) => {
    try {
      if (!request.currentUser || request.currentUser.role !== "Admin") {
        throw new AuthorizationError("user management requires admin role");
      }

      const users = await listUsers(repository);
      return reply.send({
        items: users.map(toUserManagementDto)
      });
    } catch (error) {
      return handleAuthError(reply, error, "failed to list users");
    }
  });

  server.post("/users", { schema: createUserSchema, preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<{
      email: string;
      password: string;
      displayName: string | null;
      language: "ja" | "en";
      teamId: string;
      role: "Applicant" | "Approver" | "Admin";
    }>;

    try {
      if (!request.currentUser || request.currentUser.role !== "Admin") {
        throw new AuthorizationError("user management requires admin role");
      }

      const user = await registerUser(repository, {
        email: body.email ?? "",
        password: body.password ?? "",
        displayName: body.displayName,
        language: body.language,
        teamId: body.teamId ?? "team-1",
        role: body.role ?? "Applicant"
      }, passwords);

      return reply.code(201).send(toUserManagementDto(user));
    } catch (error) {
      return handleAuthError(reply, error, "failed to create user");
    }
  });

  server.patch("/users/:id", { schema: userUpdateSchema, preHandler: [server.requireAuth, server.requireCsrf] }, async (request, reply) => {
    const params = request.params as { id?: string };
    const body = (request.body ?? {}) as Partial<{
      displayName: string | null;
      language: "ja" | "en";
      teamId: string;
      role: "Applicant" | "Approver" | "Admin";
      isActive: boolean;
    }>;

    try {
      if (!request.currentUser || request.currentUser.role !== "Admin") {
        throw new AuthorizationError("user management requires admin role");
      }

      const user = await updateUser(repository, {
        id: params.id ?? "",
        displayName: body.displayName,
        language: body.language,
        teamId: body.teamId,
        role: body.role,
        isActive: body.isActive
      });

      if (!user) {
        return reply.code(404).send(notFound("user not found"));
      }

      return reply.send(toUserManagementDto(user));
    } catch (error) {
      return handleAuthError(reply, error, "failed to update user");
    }
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
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function csrfCookieOptions() {
  return {
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
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
    return reply.code(409).send({
      error: {
        code: "STATE_CONFLICT",
        message: error.message,
        status: 409
      }
    });
  }

  if (error instanceof AuthorizationError) {
    return reply.code(error.statusCode).send({
      error: {
        code: "FORBIDDEN",
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

function notFound(message: string) {
  return {
    error: {
      code: "NOT_FOUND",
      message,
      status: 404
    }
  };
}

function toAuthUserDto(user: {
  id: string;
  email: string;
  displayName: string | null;
  language: "ja" | "en";
  teamId: string;
  role: "Applicant" | "Approver" | "Admin";
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    language: user.language,
    teamId: user.teamId,
    role: user.role,
    isActive: user.isActive
  };
}

function toUserManagementDto(user: {
  id: string;
  email: string;
  displayName: string | null;
  language: "ja" | "en";
  teamId: string;
  role: "Applicant" | "Approver" | "Admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...toAuthUserDto(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}
