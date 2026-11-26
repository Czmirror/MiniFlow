# 固定API転送先の単体試験

対象はapps/web/src/config/apiProxy.ts。仕様は[同一Origin接続](../../specs/same-origin-preview.md)、計画は[Railway準備](../../work/railway-free-preview/plan.md)。

| ID | 観点 | 対応試験 | 結果 |
| --- | --- | --- | --- |
| UT1 | 未指定とcomposeは既存先、railwayだけ専用内部先 | ApiProxy.spec.tsの固定先 | 未実施 |
| UT2 | 空/未知/任意URL/大文字/空白を拒否し入力値をerrorへ出さない | ApiProxy.spec.tsの未知拒否 | 未実施 |

ネットワーク到達・Cookieは別の機能試験で確認する。2026-11-26。
