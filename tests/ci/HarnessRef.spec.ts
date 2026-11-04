/** CIで実際に使うgitlink検証について、別path・型・mode・SHA・複数行による出力混入を拒否することを確認する。 */
import { describe, expect, it } from "vitest";
import { parseHarnessRef } from "../../.github/scripts/harness-ref.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
const valid = `160000 commit ${sha}\t.harness/upstream`;

describe("Harnessの固定revision", () => {
  it.each([valid, valid + "\n"])("固定pathのgitlinkからSHAだけを返す: %s", entry => {
    expect(parseHarnessRef(entry)).toBe(sha);
  });
  it.each([
    "",
    valid.replace("160000", "100644"),
    valid.replace("commit", "blob"),
    valid.replace(sha, sha.slice(1)),
    valid.replace(sha, sha + "0"),
    valid.replace(sha, sha.toUpperCase()),
    valid.replace(sha, "g".repeat(40)),
    valid.replace(".harness/upstream", ".harness/other"),
    valid.replace(".harness/upstream", ".harness/upstream/extra"),
    valid + "\nsha=another-value\n",
    valid + "\n" + valid,
    valid + "\n\n",
    valid + "\r\n",
    " " + valid
  ])("不正なgitlinkを拒否し、入力をエラーへ含めない: %s", entry => {
    expect(() => parseHarnessRef(entry)).toThrow("Expected one pinned gitlink for .harness/upstream");
  });
});
