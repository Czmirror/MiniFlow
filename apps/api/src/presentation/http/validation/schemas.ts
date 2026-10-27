/** HTTP入口の実行時schema。未知fieldは互換性のため許容するが、routeは許可fieldだけを渡す。 */
const text = { type: "string" };
const nonBlank = { type: "string", pattern: "\\S" };
const profile = {
  displayName: { anyOf: [text, { type: "null" }] },
  language: { type: "string", enum: ["ja", "en"] }
};
const assignment = {
  ...profile, teamId: nonBlank,
  role: { type: "string", enum: ["Applicant", "Approver", "Admin"] }
};
const managed = { ...assignment, isActive: { type: "boolean" } };

/** 許可fieldの型を検証するJSON body。既存の文字数規則はapplicationで検証する。 */
export function objectBody(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties, required, additionalProperties: true };
}

export const loginSchema = { body: objectBody({ email: text, password: text }, ["email", "password"]) };
export const accountSchema = { body: objectBody(profile) };
export const passwordSchema = { body: objectBody({ currentPassword: text, newPassword: text }, ["currentPassword", "newPassword"]) };
export const createUserSchema = { body: objectBody({ ...assignment, email: text, password: text }, ["email", "password"]) };
export const idParams = objectBody({ id: { type: "string", pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$" } }, ["id"]);
export const userUpdateSchema = { params: idParams, body: objectBody(managed) };
export const createRequestSchema = { body: objectBody({ title: nonBlank, body: nonBlank }, ["title", "body"]) };
export const updateRequestSchema = { params: idParams, body: { ...objectBody({ title: nonBlank, body: nonBlank }), anyOf: [{ required: ["title"] }, { required: ["body"] }] } };
export const decisionSchema = { params: idParams, body: objectBody({ reason: text }) };
export const requestSummarySchema = { querystring: { type: "object", properties: {}, additionalProperties: false } };
export const requestListSchema = { querystring: objectBody({
  scope: { type: "string", enum: ["all", "mine", "pendingApprovals"] },
  status: { type: "string", enum: ["Draft", "Pending", "Approved", "Rejected", "Deleted"] },
  includeDeleted: { type: "string", enum: ["true", "false"] },
  page: text, limit: text, from: text, to: text
}) };
