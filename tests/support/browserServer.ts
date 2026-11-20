/**
 * ブラウザの業務フロー試験で使うローカルAPIを起動する。
 * vite-nodeから明示実行し、本番HTTPと既存のメモリ保存先を組み立てる。
 * 固定のループバックアドレスだけで待ち受け、停止すると架空データを破棄する。
 */
import { getEnv } from "../../apps/api/src/infrastructure/config/env";
import { httpFixture } from "./http";

async function main() {
  const env = getEnv({
    JWT_SECRET: "local-browser-test-only-key",
    HOST: "127.0.0.1",
    PORT: "43121",
    CORS_ORIGIN: "http://127.0.0.1:43120",
    API_ALLOWED_HOSTS: "127.0.0.1:43121"
  });
  const fixture = await httpFixture(env);
  for (const id of fixture.users.users.keys()) {
    await fixture.users.updateProfile({ id, language: "ja" });
  }
  process.once("SIGINT", () => { void fixture.server.close(); });
  process.once("SIGTERM", () => { void fixture.server.close(); });
  await fixture.server.listen({ host: env.host, port: env.port });
  console.log("Browser test API ready at http://127.0.0.1:43121");
}

main().catch(() => {
  console.error("Browser test API could not start. Check whether port 43121 is available.");
  process.exitCode = 1;
});
