# 第3段階の機能試験案

対象仕様: [API](../../API.md)。実施結果は以下。架空ユーザーと使い捨てDB/メモリ保存先だけを使う。

| ID | 条件 | 操作・期待結果 | 手段 |
| --- | --- | --- | --- |
| FT1 | AC1/AC2 | 同じPendingを取得したapprove/approveとapprove/reject。片方のみ保存、他方409、決定履歴1件、再取得可能 | 専用PostgreSQL + 本番repository/usecase |
| FT2 | AC1 | edit/submitとedit/editの取得を同期して競合。先行だけ成功し、古い値やDraftへ巻き戻らない | 専用PostgreSQL |
| FT3 | AC1/AC2/AC6 | revise・再submit・同じactorの再決定、deleteとの競合。正常な現行遷移は通る | HTTPと専用DB |
| FT4 | AC2 | 履歴INSERT失敗を起こし、状態とversionがrollbackされる | 専用DBのfixtureで制約違反 |
| FT5 | AC3/AC4 | 2タブが同じログインでtokenを取得し、双方から更新が通る。並行取得でもcookie競合なし | 実ブラウザ + 架空API |
| FT6 | AC3/AC4 | 別タブで再login後に元タブで更新。現在sessionのtoken再取得で成功。旧session token単独は拒否 | 実ブラウザ/HTTP |
| FT7 | AC3/AC6 | token改ざん・欠落・別session・不正Origin・認証なしを拒否して未保存 | HTTP、別Originはブラウザ |
| FT8 | AC1/AC5 | 競合時は409と再取得案内。成功ログはcommit後だけ、失敗時に成功イベントなし | HTTP・logger捕捉・ブラウザ |

実時間8時間待ちと実データ移行/復旧は対象外。既存JWT期限のHTTP回帰は維持する。人間が操作していないケースを人間試験済みにしない。

## 実施結果（2026-10-26、AI実行）

FT1/FT2/FT4は専用PostgreSQLの `tests/integration/requestConcurrency.integration.ts` で成功。FT3は同scriptの再決定/delete競合で成功し、HTTPの現行遷移・role/team境界は既存試験で別に照合する。HTTPと専用DBを一体化した並行ブラウザ試験は未実施。
FT5は実ブラウザ2タブから同時account更新が双方200で成功。FT6はタブBのlogout/relogin後にAで更新200、旧tokenの拒否はCsrfSessions.spec.tsで成功。FT7は同testと既存CorsConfigで検証し、実ブラウザの別OriginフォームPOSTは403。
FT8はOperationEvents.spec.tsでHTTP409とcommit後ログを検証。ブラウザ側は保存先の競合注入fixtureがmodule境界の違いで500となったため、専用fixtureが固定409を返す方式へ修正し、再取得案内・入力保持・ログイン維持を確認した。実DB409の判定とUI表示は別々の試験であり、一体化した成功とは扱わない。自動再送なし。
ブラウザ証拠はGit対象外 `.harness/reports/stage3-tab-a-saved.png`、`stage3-origin-rejected.png`、`stage3-conflict-message.png`。初回ブラウザ接続はtimeoutし、既存タブを再取得して試験した。再loginの初回は既定のdemoメールのまま送信して400となり、架空メールを指定後に成功。
全体回帰の最終結果は実施記録に記載する。
