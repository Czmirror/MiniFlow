/** CIが取得するHarnessのrevisionをgitlinkから読む。認証・ネットワーク操作は行わず、検証済みSHAだけをActionの出力へ渡す。 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 固定pathのgitlinkを1件だけ許可する。不正なmode・型・SHA・追加行は、入力を表示せず拒否する。 */
export function parseHarnessRef(entry) {
  const match = /^160000 commit ([0-9a-f]{40})\t\.harness\/upstream\n?$/.exec(entry);
  if (!match) throw new Error("Expected one pinned gitlink for .harness/upstream");
  return match[1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");
    const entry = execFileSync("git", ["ls-tree", "HEAD", "--", ".harness/upstream"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const sha = parseHarnessRef(entry);
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\n`, "utf8");
  } catch {
    // gitの例外に内部path等が含まれても、Actionのログにそのまま出さない。
    console.error("Could not read the pinned Harness gitlink or write its output.");
    process.exitCode = 1;
  }
}
