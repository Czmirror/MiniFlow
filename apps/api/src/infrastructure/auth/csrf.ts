import { randomUUID } from "node:crypto";

export function createCsrfToken(): string {
  return randomUUID();
}
