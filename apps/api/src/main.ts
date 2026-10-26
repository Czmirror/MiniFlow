/** 設定されたbind先でAPIを起動する。ローカルの既定はloopbackのみ。 */
import { buildServer } from "./presentation/http/server.js";

import { getEnv } from "./infrastructure/config/env.js";

const env = getEnv();
const { port, host } = env;
const server = await buildServer(env);

try {
  await server.listen({ port, host });
  server.log.info(`api listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
