# 第1段階の実施結果

2026-10-26。検証環境を宣言とlockfileから再現し、旧プロトタイプのテストを現行APIへ移した。
アプリの現行ソース・公開API・DB schema/migrationに変更はない。人間のコード受け入れは未確認。

## 承認と範囲

会話「よいです、PRまで」（2026-10-26）により [計画](plan.md) の第1段階、開発依存の追加、push、通常PR作成を承認された。第2段階以降は未着手。
基点は `0384e0724bf338953f1fa78a0f33540f5f5501d2`、branchは `codex/verification-current-api`。

## 変更と受け入れ条件

| 条件 | 変更・証拠 | 結果 |
| --- | --- | --- |
| A1 再現可能な依存 | package.jsonとpnpm-lock.yamlへ直接宣言。一時コピーで依存未導入の状態からinstall、Prisma生成、型検査、test、buildを実行 | 成功 |
| A2 現行実装の振る舞い | domain39件、usecase56件。終端状態・履歴保持・認可拒否・未保存・再申請後の同一actor再決定を本番importで検証 | 成功 |
| A3 型検査と旧実装 | pnpm typecheckはworkspaceとroot/testsを実行。旧src/domain・src/applicationを削除。OpenAPI生成型src/sharedは保持 | 成功 |
| A4 品質チェック | formatの既存5文書を修正、改行はバックスラッシュへ置換。Runnerの必須format/types/tests/build/secretsはすべて成功、lintのみ従来の理由でskip | 成功 |
| A5 挙動維持と対応表 | apps/api/src・apps/webの現行ソースは変更なし。対応表はdocs/templates/request-state-transition.md。旧404例外は現行usecaseのnull返却へ対応 | 成功 |

TypeScriptの生成キャッシュ `apps/web/tsconfig.tsbuildinfo` は追跡を外し、`*.tsbuildinfo` をignoreへ追加した。型検査/buildによるキャッシュ更新がRunnerのソース変更検知へ入らないようにするため。ファイル本体はローカルに保持し、品質checkの対象ソースは減らしていない。

## 依存の確認

Vitestは既存の手元の3.2.4と同じ3系の3.2.7を採用。レジストリでversion/Node engines/license/scripts/dependenciesを確認した。MIT、配布元はnpmのvitest（repository: vitest-dev/vitest）。TypeScript 5.9.3、@types/node 24.12.0はworkspaceの既存解決版を再利用し、既存workspaceの依存解決版は変更していない。
Vite 7.3.7のenginesに合わせ、rootのNode.js下限を22.12以上と明示した。検証した実行版は24.2.0。
新規の解決グラフにはVite/Rollup/esbuild等を含み、手元の追加は46パッケージ。native binaryの配布は各パッケージのplatform optional dependencyを使用する。installは `--ignore-scripts` で行い、未確認のpostinstallや外部auditは実行していない。
Prismaは既存6.19.2の `pnpm db:generate` で明示生成した。DB接続・migration適用なし。脆弱性の網羅的な外部スキャンは未実施で、安全性の保証とは扱わない。

## 実行検証

環境: macOS、Node.js v24.2.0、pnpm 10.6.3。
対象: 上記基点に第1段階の差分を加えた作業ツリー。

- `node .harness/upstream/scripts/validate-config.mjs`: 成功。
- `node .harness/upstream/scripts/validate.mjs`: 実行予定を確認。
- `node .harness/upstream/scripts/validate.mjs --execute`: passed。実行前後のfingerprint一致、必須5check成功、lintはskip。
- `pnpm test`: 7ファイル120件成功（旧72件から移行・拡充）。
- クリーン環境: Git管理対象と今回の差分だけを一時ディレクトリへコピーし、node_modules、生成キャッシュ、.envを持ち込まず実行。pnpmの共有storeは使用したため、registryの完全な新規ダウンロード検証とは区別する。
- クリーン環境で `pnpm install --frozen-lockfile --ignore-scripts` → `pnpm db:generate` → `pnpm typecheck` → `pnpm test` → `NEXT_TELEMETRY_DISABLED=1 pnpm build`: すべて成功、120件成功。
- `git diff --check`: 成功。

## レビューと残る範囲

自己レビューでは旧テストの遷移/認可/不在の対応、失敗時の未保存、アプリソース不変更、既存lockfile解決の維持、品質check非緩和を照合した。
独立レビュー: 別文脈のreviewerがstaged差分と追加文書差分を確認し、指摘なし。A1〜A5、旧テストの観点保持、lockfile既存解決版の維持、品質設定非緩和、現行アプリソース不変更を照合した。review/security・data・tests・docs-commentsを使用。コマンドの独立再実行は行っておらず、実行結果との整合性確認である。人間の承認とは区別する。

今回追加したのはテストと検証設定で、業務ロジックは変更していないため新しい機能仕様書・単体試験仕様書は作成していない。テスト観点と対応表をコードと案内に残した。
実ブラウザ・実DBの競合/transaction・新規sessionでのルール発見は未実施。コード挙動を変更していないため今回の実動試験は対象外。文字列テスト9件の置換、認証/公開登録/入力検証/同時更新などは [全体レビュー](review.md) の未解決事項として残す。
coverage率は計測しておらず、率による比較はできない。移行前の成功・拒否・不在の観点を対応表で照合し、テスト件数だけを保証の根拠にしない。
