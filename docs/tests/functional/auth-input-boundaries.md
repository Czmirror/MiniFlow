# 認証・入力境界の機能試験

仕様: [API](../../API.md)。前提: 架空ユーザーとメモリ保存先を注入した本番HTTP、実DB未接続。実施日は2026-10-26。
AC1〜AC9は [第2段階の計画](../../work/auth-input-boundaries/plan.md) と承認済み仕様案の番号。

| ケース | AC | 操作と期待 | 対応test/証拠 | 結果 |
| --- | --- | --- | --- | --- |
| FT1 | AC1 | 旧registerは404、未保存 | TeamBoundaryRoutes「公開registerは404」 | 成功 |
| FT2 | AC1/AC6 | Adminだけ作成・割当・一覧が可能、拒否は未保存 | TeamBoundaryRoutesの未認証/role/Admin各ケース | 成功 |
| FT3 | AC1/AC6 | 別team、他人の編集、Applicantの決定、自己決定を拒否 | TeamBoundaryRoutesと既存RequestUseCases | 成功 |
| FT4 | AC5 | name-only/language-only/nullを区別し、無効値は400 | AuthInputsの部分更新と型違いケース | 成功 |
| FT5 | AC3/AC4 | 8時間、期限切れ・期限/世代なし・不一致拒否、password変更で全失効 | AuthInputsのJWTとpasswordの各ケース | 成功 |
| FT6a | AC7 | Host/Origin不一致・null・CSRFなしを拒否、正規preflight成功 | CorsConfigの実HTTPケース | 成功 |
| FT6b | AC7 | 実ブラウザのlogin→cookie/CSRF付きaccount更新→logout | IABで架空ユーザーを操作し「Account settings saved.」を確認。証拠は.harness/reports/account-browser.png | 成功（AI・2026-10-26） |
| FT6c | AC7 | 同じhostの別portのフォームを拒否 | IABで43102→43101のformを送信しFORBIDDEN/status403を確認。.harness/reports/origin-rejected.png | 成功（AI・2026-10-26） |
| FT7 | AC6 | 型違い・未知列挙値・不正UUID・空白・無効queryを400で拒否 | AuthInputsとProfileInputs | 成功 |
| FT8 | AC8 | 初期Adminの作成・重複拒否・出力に秘密なし | AdminCommand、保存先はfake | 成功 |
| FT9 | AC4 | password変更後に画面がログインへ戻る | APIの失効・cookie削除はAuthInputsで成功。ブラウザでのpassword変更フォーム送信は操作していない | 未実施（ブラウザ操作は手動確認待ち） |
| FT10 | AC9 | API/OpenAPI/生成型/共有型の整合 | openapi-typescript 7.13.0で再生成し型検査 | 成功 |

AC2は単体試験UT1で確認する。migrationの実DB適用、DBのpassword/世代更新の実行、既存データの移行は未実施。fixtureの成功で実DB検証済みとしない。
実ブラウザのpassword変更にはツールのcredential変更に対するユーザー引継ぎ規則が適用されるため、今回自動操作していない。dummyのHTTP試験と実ブラウザのprofile更新試験を分けて記録する。

追加回帰FT11（2026-10-26、AIブラウザ操作、成功）: 架空API側でsession世代を失効させ、アカウント保存401→ログイン表示→再ログイン、ログアウト401→ログイン表示→再ログイン→アカウント保存200を確認。ページ再読込は不要。実時間8時間待ちと実DBは未実施。証拠と手順は実施記録を参照。
