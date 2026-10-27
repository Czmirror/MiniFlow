# MiniFlow HTTP API

2026-10-26更新。現在の契約の正本はこの文書と [OpenAPI](openapi.yaml)。公開signupは提供しない。
型の生成先は `src/shared/api-types.ts`、Web/API間の共有型は `packages/shared/src/index.ts`。

## 認証・セッション

- `POST /auth/login` はemail/passwordを検証し、`miniflow_auth` と `miniflow_csrf` のcookieを返す。
- JWTの有効期限は発行後8時間。認証cookieも8時間。JWTにはsub（user ID）、sv（認証世代）、sid（ログイン識別子）、iat、expを含め、emailは含めない。
- auth cookieはhttpOnly、SameSite=Lax、path=/。productionではSecure。CSRF cookieはJavaScriptから読める以外は同じ寿命・属性。
- 認証のたびに署名・期限・世代と、現在のuserの有効状態を検査する。期限/世代/ログイン識別子のない旧token、期限切れ、世代不一致、無効ユーザーは401。
- password変更はhash更新とsessionVersionのincrementを同じ保存操作で行い、操作中を含む全セッションを失効させる。応答でcookieを削除し、画面は再ログインへ戻る。
- `POST /auth/logout` はそのブラウザのcookieを削除する。他のブラウザや複製済みtokenの失効操作ではない。
- `GET /auth/csrf` は認証後にCSRF tokenを取得する。tokenは署名済みログインsessionに結び付き、GETでcookieを更新せず、Cache-Control: no-storeを返す。同時/反復取得では同じ値を返す。

## HTTPの信頼境界

APIのHostは設定の許可リストと完全一致で照合する。状態変更でOriginがある場合、CORS_ORIGINのscheme/host/portと完全一致しなければ403。`Origin: null` も拒否する。
Originなしの非ブラウザ要求を許容しても、保護endpointの認証・CSRF検査は省略しない。CORSはcredentials付きで明示したOriginとGET/HEAD/POST/PATCHを許可する。
CORSの読取制限を認証やCSRF防御の代わりに扱わない。

## エンドポイント

「保護」は認証を要求し、「変更」はさらにcookieとheaderが現在のsessionに対応する署名付きCSRF tokenであることを要求する。

| Method/path | 認可・入力 | 成功 |
| --- | --- | --- |
| GET /health | DBの接続状態 | 200、status/service/db |
| POST /auth/login | email、password | 200、{user}とcookie |
| POST /auth/logout | 保護・変更 | 204、cookie削除 |
| GET /auth/me | 保護 | 200、AuthUser |
| GET /auth/csrf | 保護 | 200、{csrfToken} |
| PATCH /account | 保護・変更、displayName/language | 200、AuthUser |
| POST /account/password | 保護・変更、currentPassword/newPassword | 200、AuthUser、全失効とcookie削除 |
| GET /users | 保護、Adminのみ | 200、{items: UserManagement[]} |
| POST /users | 保護・変更、Adminのみ、email/passwordと任意profile | 201、UserManagement |
| PATCH /users/:id | 保護・変更、Adminのみ、UUIDと任意profile/team/role/isActive | 200、UserManagement |
| POST /requests | 保護・変更、title/body | 201、Request（Draft） |
| GET /requests/summary | 保護、認証userのteamと本人で全件集計 | 200、{total,mine,pending,approved,rejected,drafts} |
| GET /requests | 保護、認証userのteamで絞る | 200、{items,page,limit,total} |
| GET /requests/:id | 保護、同じteam | 200、{request,approvals} |
| PATCH /requests/:id | 保護・変更、同teamの作成者またはAdmin、Draftのみ | 200、Request |
| POST /requests/:id/submit | 保護・変更、同teamの作成者またはAdmin、Draftのみ | 200、Pending |
| POST /requests/:id/approve | 保護・変更、同teamのApprover/Admin、自分の申請は不可、Pendingのみ | 200、Approved |
| POST /requests/:id/reject | 保護・変更、同teamのApprover/Admin、自分の申請は不可、Pendingのみ | 200、Rejected |
| POST /requests/:id/revise | 保護・変更、同teamの作成者またはAdmin、Rejectedのみ | 200、Draft |
| POST /requests/:id/delete | 保護・変更、同teamの作成者またはAdmin、Draft/Rejectedのみ | 200、Deleted |

旧 `POST /auth/register` は廃止し404を返す。初期管理者は [運用手順](runbook.md) のローカルCLIで作成する。Adminのユーザー管理範囲は全ユーザーであり、今回team限定Adminへ変更しない。

## 入力契約

| field | 条件・省略・正規化 |
| --- | --- |
| email | string必須。trim/lowercaseし、既存のemail形式を検証 |
| password/currentPassword/newPassword | string必須、8文字以上。trimしない。新しい強度規則や上限は加えない |
| displayName | string/null。stringはtrim、空白はnull。PATCHで未指定なら維持、nullは削除 |
| language | ja/enのみ。作成は省略時ja、PATCHは省略時維持。nullは拒否 |
| role | Applicant/Approver/Adminのみ。作成は省略時Applicant、PATCHは省略時維持 |
| teamId（ユーザー管理） | 非空stringをtrim。作成の省略時は既存のteam-1を維持。PATCH省略は維持 |
| isActive | PATCHでbooleanのみ。falseを未指定と混同しない |
| user/requestのpath id | UUIDの構造を検証する。内部usecaseのID契約は変更しない |
| request title/body | string、作成は両方、PATCHは少なくとも一方。trimして空白のみを400で拒否 |
| approve/reject reason | string、省略可能。本文は現行どおり保持、nullは拒否 |
| status | Draft/Pending/Approved/Rejected/Deletedのいずれか |
| page/limit | 正の整数。pageと計算後のoffsetはJavaScriptで正確に表現できる範囲。limit最大100。省略時1/20、空文字は拒否 |
| includeDeleted | true/falseの文字列のみ。省略時false |
| from/to | Date.parseで有効な日時文字列。厳密ISO化や期間の前後関係の追加制約は今回加えない |

型違い・未知の列挙値・不正UUIDは400で拒否する。未知fieldは互換性のため無視し、許可fieldだけを明示的にusecaseへ渡す。
申請のteamId/createdBy/actedByと権限は認証状態から解決し、body/queryの指定を認可の根拠にしない。
本文・理由・表示名に新しい長さ上限、制御文字制限、Unicode正規化を勝手に導入しない。

## DTOとエラー

- AuthUser: id/email/displayName/language/teamId/role/isActive。passwordHashとsessionVersionは返さない。
- UserManagement: AuthUserにcreatedAt/updatedAtをISO文字列で加える。
- Request: id/teamId/createdBy/title/body/status/createdAt/updatedAt/deletedAt。詳細だけapprovalsを別配列で返す。
- Approval: id/requestId/actedBy/actionType/reason/createdAt。

エラーは `{error:{code,message,status}}`。400は入力違反、401は認証拒否、403は権限・Host/Origin・CSRF拒否、404は不在、409は状態違反・保存競合・重複email、500は内部障害。
入力の生値・秘密・ORM例外を応答へ出さない。認証保存先の障害は401に偽装せず500とする。

## 状態と保存

submitはDraft→Pending、approve/rejectはPending→Approved/Rejected、reviseはRejected→Draft。差し戻し履歴は同じ申請で保持し、再提出後は同じ承認者が再決定できる。
Approved/Deletedは終端。deleteはstatusとdeletedAtを同時に変更し、approve/rejectは状態変更と履歴追加を同一transactionに置く。
全申請更新は、サーバー取得時の保存世代に一致するときだけ保存する。競合時は409で、状態と決定履歴を残さない。クライアントは自動再送せず再取得を案内する。

## 第2段階の受け入れ条件

| ID | 確認する契約 |
| --- | --- |
| AC1 | 公開signup廃止、ユーザー作成/所属割当はAdmin限定 |
| AC2 | JWT_SECRETの未設定・空を拒否し固定鍵へfallbackしない |
| AC3 | JWT/cookieは8時間、期限/世代/ログイン識別子のない旧tokenを拒否 |
| AC4 | password変更成功で全セッション失効、操作画面も再ログインへ戻る |
| AC5 | PATCHの未指定維持とdisplayName:nullによる削除を区別 |
| AC6 | 不正型・列挙値・UUIDを400で拒否し、既存の所有/role/team判定を維持 |
| AC7 | 許可Host/Originの要求を通し、未知Host・別Origin/nullを拒否 |
| AC8 | ローカルCLIからAdminを新規作成し、既存emailを上書きせず秘密を出力しない |
| AC9 | API/OpenAPI/型/試験の契約を揃え、未実施範囲を成功と混同しない |

## 試験と運用

機能試験は [認証境界](tests/functional/auth-input-boundaries.md)、単体試験は [認証入力と永続化](tests/unit/auth-input-boundaries.md)。
DBのsessionVersion追加はmigrationファイルを用意するが、既存DBへの適用は別操作。適用前後の運用と初期Admin作成は [runbook](runbook.md) を参照する。

## 第3段階: 競合とCSRF

| 条件 | 仕様 |
| --- | --- |
| AC1 | edit/submit/approve/reject/revise/deleteのすべてで、サーバー取得後に先行更新があれば409。自動再試行しない。再取得を案内し、入力を勝手に再送しない |
| AC2 | approve/rejectの状態更新と履歴追加は原子的。片方だけ成功しない。競合の敗者は履歴を増やさない。再提出後の同一actor再決定は現行通り許可 |
| AC3 | CSRF tokenは署名済みログインsessionに結び付ける。同じsessionの反復/並行取得で同じ値を返し、GETでcookieを書き換えない。別session/改ざん/欠落/旧ランダムtokenは403 |
| AC4 | 複数タブ・同時取得・別タブ再login後も次の正規更新が可能。更新前に現在tokenを取得し、401では前段通りログインへ戻る。403/通信失敗を自動更新の再試行にしない |
| AC5 | 成功イベントは保存完了後だけ記録。actor/action/requestの内部ID、相関ID、結果等の固定fieldだけ許可し、password/JWT/cookie/メール/申請本文/理由/例外全文を含めない。ログは永続監査台帳を保証しない |
| AC6 | 既存role/team/owner・状態遷移・8時間期限・password全失効・Host/Origin境界を維持し、追加versionは内部保存用でDTOへ露出しない |

入力の正本は現行API。新しい文字数・Unicode・password規則は追加しない。versionはDB取得の非負整数だけを内部で扱い、HTTPから指定させない。CSRF入力は定めた署名付き形式だけを検証し、不正入力で書き込まない。
サーバー取得より前に別操作が終わった古い画面の内容まではAC1で検出しない。これを防ぐ公開version/If-Matchは別仕様とする。

## 申請の用途別ページと全件集計

`GET /requests`の`scope`は`all`（既定）、`mine`、`pendingApprovals`。`mine`は本人の申請、`pendingApprovals`は同一チームの自分以外のPendingを返す。Applicantの承認待ちは0件。任意のteam・createdByを指定して対象を変更できない。既存のstatus/date条件はANDで適用し、pendingApprovalsでPending以外のstatusを指定した場合は400。作成日時降順、同時刻はID降順。page/limitとincludeDeletedの既存契約は維持する。

`GET /requests/summary`はqueryを受け付けない。認証チームのDeleted以外から6指標を同一スナップショットで返す。`mine`は本人、`pending`はチーム全体のPending。各HTTP応答間の時点一致は保証しない。

Webの申請一覧・自分の申請・承認待ちは20件ずつ取得し、表示範囲と総件数、前後ページを示す。ダッシュボードの承認待ちは5件まで。画面切替で1ページへ戻り、空になった最終ページは有効ページへ1回補正する。旧認証・旧画面の応答を適用せず、取得失敗を0件に置き換えない。
