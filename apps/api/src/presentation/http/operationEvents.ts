/** HTTP操作の結果を安全な固定fieldだけで記録する。応答完了後に呼び、保存前の成功や入力全文を記録しない。 */
import type { FastifyReply, FastifyRequest } from "fastify";

const actions: Record<string, string> = {
  "POST /requests": "request.create", "PATCH /requests/:id": "request.update",
  "POST /requests/:id/submit": "request.submit", "POST /requests/:id/approve": "request.approve",
  "POST /requests/:id/reject": "request.reject", "POST /requests/:id/revise": "request.revise",
  "POST /requests/:id/delete": "request.delete", "POST /auth/login": "auth.login",
  "POST /auth/logout": "auth.logout", "PATCH /account": "account.update",
  "POST /account/password": "account.password", "POST /users": "user.create", "PATCH /users/:id": "user.update"
};

/** 登録済み更新操作と未登録操作の内部障害を記録する。logger障害は応答済みのDB成功を失敗へ変換しない。 */
export function recordOperation(request: FastifyRequest, reply: FastifyReply): void {
  const status = reply.statusCode;
  const action = actions[`${request.method} ${request.routeOptions.url}`] ?? (status >= 500 ? "http.failure" : undefined);
  if (!action) return;
  const params = request.params as { id?: unknown } | undefined;
  const resourceId = typeof params?.id === "string" && /^[a-f0-9-]{36}$/i.test(params.id) ? params.id : undefined;
  const fields = { event: "operation_result", action, actorId: request.currentUser?.id, resourceId,
    requestId: request.id, status, result: status < 400 ? "success" : status < 500 ? "rejected" : "failure" };
  try {
    if (status >= 500) request.log.error(fields, "operation failed");
    else if (status >= 400) request.log.warn(fields, "operation rejected");
    else request.log.info(fields, "operation completed");
  } catch { /* 応答後のlogger失敗で、保存済み操作を再試行させない。 */ }
}
