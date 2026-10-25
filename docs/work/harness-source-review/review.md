# ハーネスに基づく全体レビュー

2026-10-26。対象はmainの `0384e0724bf338953f1fa78a0f33540f5f5501d2`。
Harnessは `0656986cebd23d5e19c8cac30b822bd755babf7f`。開始時の作業ツリーはclean、fetch後もorigin/mainと一致。

指摘は上記基点での調査結果。第1段階での解消状況は [実施結果](stage-1-result.md) を参照する。

これはAIの自己レビュー。ソースの修正は未実施で、全ルールへの準拠や本番安全性を保証するものではない。

## 範囲と方法

現行APIのHTTP入口・認証・ユースケース・ドメイン・永続化・Prisma schema/migration、Webの起点・主要画面・APIクライアント、共有型、旧src、既存テスト、実行設定、文書の契約を照合した。
補助の旧Webパネルは参照関係と登録・チーム入力等の境界を中心に調査。CSSは静的に構成とレスポンシブ設定を確認し、全セレクターの表示検証は行っていない。
node_modules、生成物、submodule本体はアプリの修正対象外。既知の脆弱性の外部照合、実ブラウザ、実DBの競合・migration、負荷試験は未実施。

適用した主な観点はcoreのsafety/workflow/quality/principles/design/security/input-validation/comments/logging、stackのtypescript/nextjs/web/sql。冒頭コメントの一律追加やクラス分割自体を目的にしない。

## 優先して修正する指摘

### R01 / P1: 公開登録から既存チームに加入できる

場所: `apps/api/src/presentation/http/routes/auth.ts:23`。
認証なしのPOST /auth/registerが有効で、team-1のApplicantを作れる。その後ログインすれば、team-1の一覧・詳細へアクセスできる。
ステアリングの「公開signupは作らない」「チーム割当は管理者が制御」に反する。既存TeamBoundaryRoutesテストはこの登録経路が残ることを文字列で要求しており、要件と衝突している。
Securityのresource/tenant認可とproject固有ルールに対応。公開経路を廃止し、管理者のPOST /usersを正規入口にする案を推奨。初期管理者の準備方法は先に決める。

### R02 / P1: JWT秘密鍵の未設定が既知の固定値へフォールバックする

場所: `apps/api/src/infrastructure/config/env.ts:7`。
NODE_ENVに関係なく固定の開発値を採用するため、設定漏れの環境でも起動できる。既知の署名鍵と有効なユーザーIDが分かる条件では、ユーザーになりすます署名を作れる。
Securityのfail closedに対応。非空のJWT_SECRETを必須にし、未設定時は起動エラーにする。実環境の秘密値は読んでいないため、現在その条件に該当するかは未確認。

### R03 / P1: 同時操作で状態と承認履歴の不変条件が壊れる

場所: `apps/api/src/infrastructure/repositories/PrismaRequestRepository.ts:75,183`。
取得時にPendingであることは検査するが、保存条件はidだけ。2人が同じPendingを取得してapproveすれば、両方のtransactionが成功してApproved履歴が2件になり得る。次のrehydrateは「Approved履歴は1件」で例外になる。
Draftの編集とsubmitでも、古いDraftの保存でPendingを巻き戻せる。transactionは複数書き込みの原子性を守るが、読み取った状態の鮮度は守らない。
SQLの競合制御・Qualityの不変条件に対応。全更新をversionによる条件付き保存に揃え、競合を409として扱う案を推奨。実DBでの再現は未実施、保存条件とDB制約からの静的指摘。

### R04 / P2: アカウントPATCHが未指定値を上書きする

場所: `apps/api/src/application/auth/UpdateAccount.ts:14`。
languageのみ送信するとdisplayNameをnullへ、displayNameのみ送信するとlanguageをjaへ更新する。共有型では両方optional。
In-memoryのrepositoryで現行usecaseを実行し、保存引数を確認した。language-onlyは `{id:"user-1",displayName:null,language:"en"}`、name-onlyは `{id:"user-1",displayName:"New",language:"ja"}`。
Input validationの未指定/nullの区別に対応。未指定は維持、nullは許可フィールドだけ明示的な削除として扱う。

### R05 / P2: HTTP入力にruntime検証が不足している

場所: `routes/auth.ts`、`routes/requests.ts`、`application/auth/RegisterUser.ts`、`UpdateUser.ts`、`application/requests/ListRequests.ts`。
body/queryをasでキャストしているが、role/languageのallowlist、UUID、reasonの型、status等が実行時に検証されない。例えば不正roleをString列へ保存でき、応答のUserではApplicantへ正規化されるため保存値と返却値がずれる。数値displayNameはUpdateUserのtrimで例外、不正status/UUIDはORMに達し500になり得る。
Draft更新でtitle/bodyを空白にすると一般Errorとなり500に変換される。作成時の空白検査とはエラー分類も異なる。
Input validation/TypeScriptに対応。入口で型と既存の列挙値を検証し、入力由来の違反は400に統一する。長さ上限や制御文字の扱いは業務仕様として未確定、勝手に追加しない。

### R06 / P2: UIの一覧と集計が先頭20件しか扱わない

場所: `apps/web/src/lib/requestApi.ts:24`、`components/MiniFlowApp.tsx:383`、`application/requests/ListRequests.ts:13`。
APIは既定20件のページングだが、クライアントはpage/limitを送らずtotalも使わない。21件目以降は画面に出ず、自分の申請・承認待ち・ダッシュボード集計も先頭ページだけから算出される。
Webの重要操作/境界契約に対応。画面の一覧ページングとサーバー側の用途別絞り込み・集計を設計する。単に100件へ増やす修正では解消しない。

### R07 / P2: CSRF取得のたびに共有cookieを更新し、他タブのキャッシュが古くなる

場所: `routes/auth.ts:78`、`plugins/auth.ts:65`、`apps/web/src/lib/authApi.ts:14,142`。
CSRFのcookieはタブ間共有、キャッシュはモジュール単位。タブBでcsrfを取得すると、タブAのキャッシュとcookieが一致せず正規の更新が403になる。並行した初回取得にも同じ競合がある。
さらに現在は単純なcookie/header比較で、sessionに結び付けた署名付きtokenではない。後者は防御設計の不足であり、このレビューでは攻撃の成立を実証していない。
Security/Webに対応。sessionに結び付いた安定したtokenの取得へ変更し、複数タブ・並行取得の正常系と異常系をブラウザで検証する。

### R08 / P2: JWTに有効期限とパスワード変更後の失効がない

場所: `routes/auth.ts:61`、`presentation/http/server.ts:26`、`application/auth/ChangePassword.ts`。
jwtSignにexpiresInがなく、設定にも期限がない。パスワード変更はhash更新のみで、古いtokenはユーザーが有効な限り引き続き認証に使える。logoutもブラウザcookieの削除であり、取得済みtokenを失効しない。
Securityのsession境界に対応。有効期間と変更時の失効方針を人間が決める必要がある。

## 設計・検証・運用の指摘

### R09 / P2: テストと型検査が現行実装を十分に検証しない

`tests/domain/request/Request.spec.ts` の28件と `tests/application/usecases/RequestUseCases.spec.ts` の19件は旧 `src/` をimportする。旧Requestは同一actorの再決定を禁止する一方、現行APIは再申請後の再決定を許可する。
現行ルート権限・CORS・画面の計9件はソース文字列の存在検査であり、実際のHTTP結果・レンダリングを保証しない。ルートのpnpm typecheckはworkspaceだけを実行し、rootのtests/srcは対象外。
Quality/DRYに対応。現行domain/usecaseに振る舞いテストを移し、HTTPはFastify inject、UIは操作結果を検証する。旧実装の保持理由を整理し、移行後に削除する。

### R10 / P2: クリーン環境で検証環境を再現できない

root package.jsonはdevDependenciesが空、lockfileのroot importerも空でVitestの宣言がない。手元のVitestは既存node_modulesに依存している。lintは未導入で、formatは既存Markdown5件の行末空白により失敗する。
Quality/TypeScriptに対応。Vitestとroot型検査に必要な直接依存を明示し、pnpmのlockfileへ反映する。Markdownの改行意図を壊さず書式を修正する。依存追加と品質設定変更は計画の対象。

### R11 / P2: 言語・画面・通信の責務が1コンポーネントと共有可変状態に集まる

`MiniFlowApp.tsx` は認証・各フォーム・申請処理・ユーザー管理・画面表示・辞書を持ち、レンダー中にモジュールのlabelsを更新する。複数インスタンスや並行レンダーでは他の利用者の表示状態と干渉する構造。
Design/Principlesに対応。画面別表示、辞書、各機能の通信状態を変更理由で分ける。labelsはpropsまたはcontextで各ツリーに閉じる。行数だけを根拠に機械的分割はしない。

### R12 / P2: 定義の重複と依存方向の逆転

`apps/api/src/domain/request/Request.ts:2` がapplicationのStateConflictErrorをimportする。認証usecaseはinfrastructureのbcrypt実装を直接importする。旧srcと現行apps/apiに異なるRequest/Approval/usecase、共有型とAPI domainにstatus/role等が重複し、未参照の旧Webパネルも残る。
DRY/Designに対応。domain errorを内側へ置きHTTPで変換し、password操作は実際のtest置換に必要な小さい契約を検討する。HTTPのactor/team境界をusecaseへ移す場合は権限・状態チェックを同一保存契約へまとめる。無意味なinterface追加は行わない。

### R13 / P2: 障害と業務イベントの観測が不足

`plugins/auth.ts` は全例外を401にし、DB障害も認証失敗に見せる。auth routeは予期しない例外をログに残さず500を返す。一方requests routeは例外を丸ごとloggerへ渡している。NFRのactor/action/requestId付き業務イベントは記録されていない。
Logging/Qualityに対応。認証エラーと内部障害を区別し、安全なフィールドだけを既存loggerへ出す。監査イベントのフィールドと入力値の除去をテストする。実ログに秘密が漏れた事実は未確認。

### R14 / P2: ローカル公開範囲と入力元の防御が未定義

`apps/api/src/main.ts` は0.0.0.0へ固定bind、serverにHost/Origin検証がない。CORSは応答の読み取り制限であり、認証・CSRF自体の代用にならない。
Securityのローカルserver境界に対応。localhost直起動とDocker起動のbind/許可Host/Originを分けて定義する。Docker内部の0.0.0.0は用途があるため一律禁止しない。

### R15 / P3: 文書・ステアリングと現状がずれている

PRD/NFRはNestJS・ApproverPolicy・パスワード非対象を記載するが実装はFastify・role判定・password認証。API/OpenAPI/共有型はteamIdをクライアント入力として要求するが、現行APIは認証ユーザーから解決する。domain READMEはplaceholderのまま。
ステアリングのタイトル/チーム表示の既知課題は既に対処されている。Adminのチームを変えた後にUIのcurrentUserを再取得しない点は別の同期課題として残る。
Workflow/Commentsに対応。実装を勝手に仕様へ合わせず、どの契約を正本とするか確認して文書を更新する。ソースの地図も整える。

## 検証結果と限界

- Vitest: 7ファイル72件成功。ただしR09の範囲制限あり。
- rootの `pnpm exec tsc -p tsconfig.json --noEmit`: 成功。通常のworkspace型検査とは別に実行した。
- validate-config: 成功。format: 既存Markdown5件で失敗。
- 部分更新: 現行usecaseをfake repositoryへ接続してR04を再現。DB接続なし。
- 初回のtsx CLI実行はsandboxのIPC制限で失敗。同梱tsxのNode import経由で再実行し成功。
- build/workspace型検査/secret検査は直前の導入作業で成功済み。今回はアプリ差分がないため再実行していない。
- 実DB・実ブラウザ・ネットワークを伴う攻撃・依存脆弱性調査は未実施。競合とCSRFのブラウザ動作は修正時に検証する。
- 独立レビューは未実施。今回の成果物は調査記録と計画であり、アプリ修正や品質設定の変更は含まない。
