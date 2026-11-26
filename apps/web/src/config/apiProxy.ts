/** Docker buildの配信先名を固定の内部APIへ対応させる。Next設定から呼ばれ、秘密や外部I/Oを扱わない。 */
export function resolveApiProxyDestination(target: string | undefined): string {
  if (target === undefined || target === "compose") return "http://api:3001";
  if (target === "railway") return "http://api.railway.internal:3001";
  throw new Error("MINIFLOW_DEPLOY_TARGET must be compose or railway");
}
