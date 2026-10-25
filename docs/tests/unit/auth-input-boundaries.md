# 認証入力・保存の単体試験

対象: getEnv、profile validatorとauth usecase、password更新の保存契約、CLI。仕様は [API](../../API.md)、手順は [runbook](../../runbook.md)。実施日2026-10-26。
入力値・期待値の詳細は各testコードが正本。

| ケース | 対象と観点 | 対応test | 結果 |
| --- | --- | --- | --- |
| UT1 | 設定のfail-closed、秘密を含めないエラー、port/Host/Origin | Env.spec.ts | 成功 |
| UT2 | profileの省略/null/空白/言語列挙値/型違い | ProfileInputs.spec.ts、UserAccountUseCases.spec.ts | 成功 |
| UT3 | register/updateのrole/team/isActiveの型と未知値、未保存 | ProfileInputs.spec.tsとHTTPのTeamBoundaryRoutes | 成功 |
| UT4 | 申請編集の空白と一覧のpage/limit/status | RequestUseCases.spec.tsとHTTPのAuthInputs | 成功 |
| UT5 | hashと世代incrementの同一保存呼出し | AdminCommand.spec.ts「Prisma password更新契約」 | 成功 |
| UT6 | 署名・期限・世代・保存障害 | HTTPのAuthInputsで本番pluginを経由 | 成功 |
| UT7 | CLIの入力・重複・例外・出力 | AdminCommand.spec.ts | 成功 |

UT5はPrisma呼び出しの引数契約を確認するもので、実DBの更新・transaction・migration成功を保証しない。
申請保存の競合とCSRF方式の変更、新しいpassword強度や文字数/Unicode制約は対象外。
