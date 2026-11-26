# Railway無料枠の公開準備

2026-11-26時点の準備手順。アカウント接続と専用project作成を実施し、Web/API/PostgreSQLと500MBの専用保存領域の設定を未適用で保存した。公開・実DB適用は実施していない。まず招待した相手への限定プレビューとして使う。

## 無料範囲

[公式Freeプラン](https://docs.railway.com/pricing/free-plan)は1project/最大3services、月1ドル相当の利用枠、各service最大0.5GB RAM。新規Trialは30日/5ドル相当で、継続無料枠とは異なる。枠を使い切ると停止する。常設・常時稼働を保証しない。実アカウントは同日の確認時点でTrial、残30日/5ドル、利用0ドルだった。起動前にも残枠を確認し、有料upgradeや支払い方法追加をしない。

## 作成する構成

同じproject/environmentにWeb、api、PostgreSQLを置く。APIのservice名はapiに揃え、内部DNSはapi.railway.internal。WebだけにRailway提供のHTTPS domainを付ける。APIとDBのpublic domain/TCP proxyは作らない。独自domain、常時監視、cronは今回使わない。

| サービス | build/起動 | 設定 |
| --- | --- | --- |
| Web | repository rootをcontext、apps/web/Dockerfileを指定。起動はimageのCMDを使う | RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile、MINIFLOW_DEPLOY_TARGET=railwayをbuild時に指定。NEXT_PUBLIC_API_BASE_URL=/api。待受PORT=3000 |
| api | repository rootをcontext、apps/api/Dockerfileを指定。起動はimageのCMDを使う | RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile、NODE_ENV=production、PORT=3001、HOST=0.0.0.0、API_ALLOWED_HOSTS=api.railway.internal:3001、CORS_ORIGINはWebの実HTTPS Origin |
| PostgreSQL | RailwayのPostgreSQL serviceと専用volume | 既存DBと分離。APIのDATABASE_URLはproviderの内部接続を秘密設定で参照する |

JWT_SECRETは専用乱数の32バイト以上をRailwayの秘密設定へ保存する。資格情報・Cookie・接続文字列はGit、チャット、TickTick、build引数へ書かない。固定のローカルfixture値を流用しない。

[Dockerfile指定](https://docs.railway.com/builds/dockerfiles)を使い、root directoryをapps/webやapps/apiへ狭めない。モノレポの共有型とlockfileが必要なため。内部DNSは[公式Private networking](https://docs.railway.com/networking/private-networking)に従う。build時には内部APIやDBへ接続しない。

新しいrailway.json/railway.tomlは追加しない。[公式IaC](https://docs.railway.com/infrastructure-as-code)では旧Config as Codeの新service利用が不可で、2026-12-01に読込終了と案内されている。接続後にservice設定を確認し、必要な場合だけ現行方式で管理する。未検証のIaC packageやCLIを追加しない。

## 公開開始の条件

1. 無料plan/残枠、Web/API/DBだけの3services、非公開のAPI/DB、停止/削除先を確認する。費用が必要なら停止して再計画する。
2. 公開するrevisionと同じimageを確認する。まだDB migrationや初期管理者作成を自動起動へ混ぜない。実Railway DBへの既存9migrationと最小の架空ユーザー投入は、対象と復旧方法を提示して別途個別承認を受ける。以前のlocalhost承認はRailway DBへ広げない。
3. 入り口のアクセス制限と公開Hostを決める。限定公開の制御が未確定ならpublic domainを有効にしない。管理者の資格情報を共有せず、架空データだけで確認する。
4. 実HTTPSでCookie、CSRF、Host/Origin、no-storeを照合し、申請/差し戻し/再提出/承認、チーム分離、管理と本人設定を確認する。local alias試験をこの確認の代替にしない。
5. 不具合時はWebの公開を停止する。DBを自動で削除/初期化しない。既知の状態へ戻す手順と担当を決めてから共有する。

## 接続待ちでもできる試験

`docker compose -p miniflow-container-e2e -f tests/integration/container.compose.yml -f tests/integration/railway.compose.yml build web`でRailway内部名を使うWebを作る。同じ2ファイルで起動し、同じ専用DBを個別承認後に初期化する。APIには内部名のDocker DNS aliasだけを追加し、実Railwayへ通信しない。

既存のTLS試験入口と`containerWorkflow.mjs`で23項目を確認する。この試験はローカル専用で、公開URL・Railwayの課金/volume/sleep/復帰の実証ではない。[作業記録](work/railway-free-preview/result.md)へ結果を残す。
