/** HTTPの組立とtransport境界。保存先を注入し、DBの生成・切断はproductionの組立に委ねる。 */
import { bcryptPasswordOperations } from "../../infrastructure/auth/password.js";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyServerOptions } from "fastify";
import { recordOperation } from "./operationEvents.js";
import type { AppEnv } from "../../infrastructure/config/env.js";
import type { UserRepository } from "../../application/ports/UserRepository.js";
import type { RequestRepository } from "../../application/ports/RequestRepository.js";
import { AUTH_COOKIE_NAME, SESSION_TTL_SECONDS } from "../../infrastructure/auth/jwt.js";
import { authPlugin } from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerRequestRoutes } from "./routes/requests.js";

/** 検証済み設定と保存先でHTTPを構築する。listenやDB接続は行わない。 */
export async function createHttpServer(options: {
  env: AppEnv; userRepository: UserRepository; requestRepository: RequestRepository; logger?: FastifyServerOptions["logger"];
}) {
  const { env } = options;
  const server = Fastify({ disableRequestLogging: true, logger: options.logger ?? false, ajv: { customOptions: { coerceTypes: false, removeAdditional: false } } });
  server.addHook("onResponse", async (request, reply) => { recordOperation(request, reply); });
  server.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host?.toLowerCase();
    const origin = request.headers.origin;
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (!host || !env.allowedHosts.includes(host) || (unsafe && origin !== undefined && origin !== env.corsOrigin)) {
      return reply.code(403).send({ error: { code: "FORBIDDEN", message: "untrusted request origin or host", status: 403 } });
    }
  });
  server.setErrorHandler((error, request, reply) => {
    const validation = typeof error === "object" && error !== null && "validation" in error;
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    if (validation || (statusCode >= 400 && statusCode < 500)) {
      const status = validation ? 400 : statusCode;
      return reply.code(status).send({ error: { code: "INVALID_INPUT", message: "invalid request", status } });
    }
    // ORMや入力の生値が例外messageに含まれても公開・記録しない。
    return reply.code(500).send({ error: { code: "INTERNAL_SERVER_ERROR", message: "request failed", status: 500 } });
  });
  await server.register(cors, { origin: env.corsOrigin, credentials: true, methods: ["GET", "HEAD", "POST", "PATCH"] });
  await server.register(cookie);
  await server.register(jwt, { secret: env.jwtSecret, sign: { expiresIn: SESSION_TTL_SECONDS }, cookie: { cookieName: AUTH_COOKIE_NAME, signed: false } });
  await server.register(authPlugin, { userRepository: options.userRepository, csrfSecret: env.jwtSecret });
  registerAuthRoutes(server, options.userRepository, env.jwtSecret, bcryptPasswordOperations);
  registerRequestRoutes(server, options.requestRepository);
  return server;
}
