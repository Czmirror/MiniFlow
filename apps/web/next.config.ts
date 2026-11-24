/** 通常の開発設定を保ち、Docker用のWeb成果物と配信条件を定める。秘密やDB設定は扱わない。 */
import path from "node:path";
import type { NextConfig } from "next";

const standaloneBuild = process.env.MINIFLOW_STANDALONE === "1";

const nextConfig: NextConfig = {
  output: standaloneBuild ? "standalone" : undefined,
  // プレビューの検索除外と入口HTMLの再検証はDocker成果物だけに適用する。
  headers: async () => standaloneBuild ? [
    { source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    { source: "/", headers: [{ key: "Cache-Control", value: "no-cache" }] }
  ] : [],
  transpilePackages: ["@miniflow/shared"],
  outputFileTracingRoot: path.join(__dirname, "../..")
};

export default nextConfig;
