# CIのHarness参照の単体試験

- 対象: `.github/scripts/harness-ref.mjs`の`parseHarnessRef`。
- 関連: [仕様](../../specs/ci-validation.md)、[計画](../../work/ci-validation/plan.md)。
- 対応する試験: `tests/ci/HarnessRef.spec.ts`。

| ID | 観点 | 条件と期待結果 | 対応するtest | 結果 |
| --- | --- | --- | --- | --- |
| UT1 | 正常・末尾改行 | 固定path・mode・型・40桁SHAだけを受け付け、SHAだけを返す | 固定pathのgitlinkからSHAだけを返す | 成功 |
| UT2 | 不正入力・出力混入 | 別mode・型・path、不正な長さ・文字、追加行・空白を拒否し、入力をエラーへ出さない | 不正なgitlinkを拒否し、入力をエラーへ含めない | 成功 |

- 2026-11-04に16件成功。CLIは実repositoryからgitlinkを読み、GITHUB_OUTPUTの一時ファイルに一致するSHAを書き込むことも確認した。
- GITHUB_OUTPUTなしのCLI実行は、安全な固定エラーだけを出してexit 1になることを確認した。
- private Harnessの取得とGitHub上の出力連携は機能試験の対象であり、上記の成功では保証しない。
