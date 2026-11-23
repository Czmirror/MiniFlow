/** 固定loopbackのWeb/APIを、試験用証明書で同一HTTPS Originへまとめる。公開配信には使わない。 */
import https from "node:https";
import http from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (!process.argv[2]) throw new Error("Pass the directory of the disposable test certificate");
const server = https.createServer({ key: readFileSync(join(process.argv[2], "key.pem")), cert: readFileSync(join(process.argv[2], "cert.pem")) }, (request, reply) => {
  if (request.headers.host !== "localhost:43150") { reply.writeHead(403).end(); return; }
  const api = request.url?.startsWith("/api/");
  const port = api ? 43151 : 43152;
  const upstream = http.request({ hostname: "127.0.0.1", port, method: request.method,
    path: api ? request.url.slice(4) : request.url,
    headers: { ...request.headers, host: `localhost:${port}` } }, response => {
    reply.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(reply);
  });
  upstream.on("error", () => { if (!reply.headersSent) reply.writeHead(502); reply.end(); });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
});
server.listen(43150, "127.0.0.1", () => console.log("Container E2E HTTPS ready at https://localhost:43150"));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
