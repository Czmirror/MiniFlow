/** DBなしで本番HTTPを構築するfixture。架空ユーザーだけを持ち、tokenは本番のloginから取得する。 */
import { createHttpServer } from "../../apps/api/src/presentation/http/createHttpServer";
import { getEnv, type AppEnv } from "../../apps/api/src/infrastructure/config/env";
import { User, type UserRole } from "../../apps/api/src/domain/user/User";
import type { UserRepository } from "../../apps/api/src/application/ports/UserRepository";
import { hashPassword } from "../../apps/api/src/infrastructure/auth/password";
import { InMemoryRequestRepository } from "./requests";

export const userIds = { Applicant: "11111111-1111-1111-1111-111111111111", Approver: "22222222-2222-2222-2222-222222222222", Admin: "33333333-3333-3333-3333-333333333333", Outsider: "44444444-4444-4444-4444-444444444444" };
export const requestId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const testPassword = "fixture-password-only";
// 架空の固定passwordのhashだけをtest process内で再利用する。毎試験の保存先・userは独立する。
let fixturePasswordHash: Promise<string> | undefined;

/** Userの保存だけを置換するfake。実DBのtransaction・制約を保証しない。 */
export class MemoryUsers implements UserRepository {
  readonly users = new Map<string, User>();
  writes = 0;
  async create(input: Parameters<UserRepository["create"]>[0]) {
    const user = new User({ ...input, createdAt: new Date(), updatedAt: new Date() });
    this.users.set(user.id, user); this.writes++;
    return user;
  }
  async findById(id: string) { return this.users.get(id) ?? null; }
  async findByEmail(email: string) { return [...this.users.values()].find(u => u.email === email) ?? null; }
  async list() { return [...this.users.values()]; }
  async updateProfile(input: Parameters<UserRepository["updateProfile"]>[0]) {
    const current = this.users.get(input.id);
    if (!current) throw new Error("missing fixture user");
    const defined = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const next = new User({ ...current, ...defined, updatedAt: new Date() });
    this.users.set(next.id, next); this.writes++;
    return next;
  }
  async updatePassword(input: Parameters<UserRepository["updatePassword"]>[0]) {
    const current = this.users.get(input.id);
    if (!current) throw new Error("missing fixture user");
    const next = new User({ ...current, passwordHash: input.passwordHash, sessionVersion: current.sessionVersion + 1, updatedAt: new Date() });
    this.users.set(next.id, next); this.writes++;
    return next;
  }
}

/** 設定・保存先・login操作を返す。実DBへ接続しない。呼び出し元はserver.close()する。 */
export async function httpFixture(envOverride?: AppEnv, logger?: Parameters<typeof createHttpServer>[0]["logger"]) {
  const env = envOverride ?? getEnv({ JWT_SECRET: "test-only-authentication-key" });
  const users = new MemoryUsers();
  const requests = new InMemoryRequestRepository();
  const passwordHash = await (fixturePasswordHash ??= hashPassword(testPassword));
  for (const [name, id] of Object.entries(userIds)) {
    const user = new User({ id, email: `${name.toLowerCase()}@example.test`, passwordHash, displayName: "Fixture", language: "en", teamId: name === "Outsider" ? "team-2" : "team-1", role: name === "Outsider" ? "Applicant" : name, createdAt: new Date(), updatedAt: new Date() });
    users.users.set(id, user);
  }
  const server = await createHttpServer({ env, userRepository: users, requestRepository: requests, logger });
  async function login(role: UserRole | "Outsider" = "Applicant") {
    const response = await server.inject({ method: "POST", url: "http://localhost:3001/auth/login", headers: { origin: env.corsOrigin }, payload: { email: `${role.toLowerCase()}@example.test`, password: testPassword } });
    if (response.statusCode !== 200) throw new Error(`fixture login failed: ${response.statusCode}`);
    const csrf = response.cookies.find(c => c.name === "miniflow_csrf")!.value;
    return { cookie: response.cookies.map(c => `${c.name}=${c.value}`).join("; "), "x-csrf-token": csrf, origin: env.corsOrigin };
  }
  return { server, env, users, requests, login };
}
