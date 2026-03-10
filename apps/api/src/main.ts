import { buildServer } from "./presentation/http/server.js";

const port = Number(process.env.PORT ?? 3001);
const host = "0.0.0.0";

const server = await buildServer();

try {
  await server.listen({ port, host });
  server.log.info(`api listening on http://${host}:${port}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
