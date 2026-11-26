# Railway無料枠の準備結果

Railwayを公開先として選んだため、Webが専用の内部DNSへ接続できる実装を追加した。アカウント接続と無料試用枠を確認し、専用projectにWeb/APIの設定を未適用で保存した。まだ公開URLは作成していない。単体・本番build・ローカルDNS alias検証と準備記録を同じPR33へまとめる。

## 実装と仕様

対象3944809..c12e441。[計画](plan.md)と[既存接続仕様](../../specs/same-origin-preview.md)に沿い、build引数MINIFLOW_DEPLOY_TARGETをcompose（既定）/railwayの2種類に限定した。railwayは固定http://api.railway.internal:3001だけを選び、空/未知/任意URLは固定messageで拒否する。Next設定にあった固定先を純粋関数へ集約し、旧直書きは置換した。通常buildは転送なし、認証・認可・DB・UI・依存・CI/Harness設定の変更はない。

自己レビューでは関数は固定先選択、Next設定は配信、Dockerfileは組立、Compose overrideはローカル接続という責務を照合した。秘密/ネットワークを関数へ渡さず、入力を例外へ含めない。security/data/tests/docs-commentsを使用。3944809..c12e441の独立AIレビューも指摘なし。これは人間受け入れではない。

## 検証

ApiProxy.spec.tsの8試験成功。未指定/composeの互換、railway固定先、未知/空白/大文字/任意URLの拒否を確認した。Profileと実行計画を確認後、NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --executeが成功。33ファイル415テスト・型検査・通常本番build・文体/秘密検査が成功した。lintは既存skip、依存監査とCI自動E2Eは未整備。

Railway指定Dockerbuild成功。Web image sha256:de8524e1112a557b9cc9382521af39ce8f395a8aceb73dfa30395354c89f72e6、Next build ID 7BeqWKpfFbps9WYwN0xwG。実行中manifestの転送先はhttp://api.railway.internal:3001/:path*で、APIのPortBindingsは空。専用ComposeのaliasでだけDNSを再現し、実Railwayへ通信していない。

固定localhost HTTPSでHTML200/no-cache/noindex、static7件200/immutable、未認証API401/不正Origin403/no-storeを照合した。実装c12e441と同じimageでChrome158.0.8127.37/Playwright1.65.1の23項目すべて成功。API応答123件でno-store不足0、意図したHTTP拒否401×9/403×4/400×3、対応console16件、page error0、予期しないブラウザHTTP拒否0。[生結果](e2e-evidence.json)・[HTTP](http-evidence.json)・[SQL](sql-evidence.txt)を保存する。SQLは値を維持して末尾空白だけを正規化した。

API再起動中の復帰pollで14:04:42.895/43.008 UTCにWebの接続拒否2回が記録され、その後200と画面/履歴保持が成功。これをエラーなしとは扱わず、予定した再起動停止中の出力として記録した。ほかのAPI level50/60・未処理例外はなし。

SQLはusers5、本人ja/sessionVersion1、管理対象Approver/team-2/無効、禁止ユーザー0、Approved/version7/判断2/承認者1人。専用Compose/proxy/browserを終了し、tmpfs DB・試験証明書を削除した。標準415テストとローカル23項目E2Eは別の確認で、後者はCIに含まれない。RFT1〜2/UT1〜2成功。

## 公開に残る作業

2026-11-26 23:20 JST時点でRailway接続済み。Usage画面でTrial、残30日/5ドル、利用0ドルを確認した。支払い方法追加や有料upgradeは行っていない。TickTickの既存接続タスクは完了に更新した。資格情報は受け取っていない。

専用の非公開project「MiniFlow Preview」、environment「preview」を作成した。Web/APIはstaged-createのままで、29件の設定を保存した。repository root、各Dockerfile、sleep有効、失敗時最大3回再起動、固定revision783ddb8、非秘密の接続設定を準備済み。get-staged-changesでSTAGED/destructive=falseを確認した。デプロイ、volume、DB、公開domain、TCP proxyは未作成。APIのDATABASE_URL/JWT_SECRET/CORS_ORIGINも未設定で、この途中状態をそのまま適用しない。

各serviceの0.5GB/1vCPU上限を同時に指定する更新は「Service Instance not found」で失敗した。上限を含めない設定のstageは成功した。実instanceがない段階の上限設定は未解決であり、上限を設定済みとは扱わない。起動前に実設定と無料枠内の制限を確認する。sleep設定の保存は実際の休止・復帰成功を意味しない。

再開対象はproject ab629565-88f2-45f8-96f6-739db20ba86f、environment 4904a6f1-f700-4d32-9d61-96ca1c43835f、pending patch 8296b771-2159-4fce-a8eb-493b51b4f3df。同じprojectを再利用し、重複作成しない。まずpending差分と残クレジットを読み直す。次に専用PostgreSQL/volume・制限・秘密設定・入口のアクセス制限を具体化する。実DB migration・架空ユーザー投入はlocalhostの承認を流用せず、対象と復旧方法を提示して個別承認後に実施する。設定の適用前にも具体的な差分を確認する。

無料枠の実稼働/sleep/復帰/容量/消費と実HTTPSの確認は未実施。ローカル成功を実公開の証拠にしない。負荷性能の目標は未定で、常設稼働を保証しない。実Railwayの起動・公開部分は準備途中、ローカル実装はHumanReview待ちとして分ける。公開入口のアクセス制限・Host・信頼されたTLS・公開先E2E・データ復旧方法が未確認なら資格情報を不特定多数へ公開しない。

DB schemaとmigrationファイルは変更なし。既存9migrationの今回の適用先は、個別承認済み固定localhost:55449/miniflow_container_testの空tmpfsだけ。元workspaceのホームページ変更を保護している。画面変更はなく視覚設計比較は適用外。公開時のLICENSE/表示条件と人間による実画面確認は残る。新しい範囲外問題はなし。

## 2026-11-27：専用DBの稼働前準備

会話「とりあえず次へ。期間すぎる前に候補を考えたいです」に基づき、同じ公開準備を続けた。元workspaceの変更は触らず、作業branchとremoteは24f15c4で一致、mainはaa44b21のままと確認した。

Railwayの標準PostgreSQLテンプレートは18を指していたため、自動導入しなかった。ローカル23項目で使用済みの公式postgres:16-alpineを同じdigest a5074487380d4e686036ce61ed6f2d363939ae9a0c40123d1a9e3bb3a5f344b4で指定した。新規service「Postgres」と専用volume「miniflow-preview-data」を未適用で保存した。容量500MBは継続無料枠の0.5GB以内に収めるための構成値であり、実際の消費量は未検証。

DB名とユーザー名はminiflow_preview、保存先は/var/lib/postgresql/data/pgdata、volumeのmount先は/var/lib/postgresql/data。POSTGRES_PASSWORDは未設定。認証を無効にするtrust設定は使わない。APIからの接続情報もまだ設定せず、不完全な状態で起動しない。

対象serviceはaad91f63-d2c7-44be-9dc5-59ba36c7ec45、volumeはcda535d2-11fc-4f5f-a829-2c6559ec4519。同じpending patchの保存件数は37件となった。get-staged-changesで3servicesと1volumeの新規作成のみ、STAGED/destructive=falseを照合した。実際のresource払い出し・起動・DB作成・migration・データ投入・公開は未実施。Web/APIの上限設定の問題も未解決である。

自己レビューでは、既存DBや既存volumeの更新/削除が含まれないこと、DBが検証済み16のままであること、秘密値が差分に含まれないことを確認した。今回は準備記録と未適用構成だけの変更で、製品コード・SQL・試験コードは変更していない。415テスト/23項目E2Eの過去の成功を実Railway DBの成功に置き換えない。稼働前の差分照合は成功、実環境E2Eは未実施。

試用終了前の公開先比較をTickTickへ重複なしで登録した。期限・通知・繰り返しは指定されていないため設定していない。比較は実測使用量、継続無料枠、休止・復帰、データ保持と移行の手間を基準とし、有料契約は別途判断する。次は秘密設定、リソース上限、入口制限、DB初期化手段と復旧手順を具体化する。実DBへの適用には対象を示した個別承認が必要な状態を維持する。

## 2026-11-27：DB更新用CLIと秘密設定

ユーザーの無料枠での公開準備・E2E継続の依頼に基づく。Prisma CLIは既存の宣言範囲と解決版6.19.2を維持したまま本番依存へ移した。schemaと9migrationを最終API imageへ同梱した。通常CMDはnode dist/main.jsのままで、build・起動時のDB適用は追加していない。明示実行のコマンドはrunbookへ記載した。

最初の同梱検査ではCLIの短縮入口が生成されず、実体ファイルの直接起動でも不足するengineへの書込要求で失敗した。本番依存側のCLIでClientを生成するようbuildを修正し、必要なengineも構築時に揃えた。修正後のimage 25ec5d2b75110710e60256e3c143a19d59087b8ac738968df4871618c367eff9は、UID1000・読取専用・network noneでCLI6.19.2が起動した。schema・9migration・PrismaのApache-2.0 LICENSEの同梱と、tsx不在を照合した。TypeScript5.9.3はPrismaの任意peer依存として間接同梱される。imageサイズは470456981から520825533 bytesへ増加した。圧縮転送量やRailwayの実メモリ使用量を改善したとは主張しない。

同じimage内CLIから、以前に個別承認された固定localhost:55449/miniflow_container_testの空tmpfsへ既存9migrationを適用し、成功した。既存のseed入口で架空4人を投入した。Railway DBでは実施していない。標準検証の初回は認証試験1件が5秒でtimeoutし、414/415成功でbuild/securityは未実行となった。該当ファイル単独の20試験は成功した。Docker build等の並行負荷の影響が考えられるが、原因を確定したとは扱わない。試験時間の上限や既存検証設定は変更していない。

Railwayでは専用DBパスワードとJWT署名鍵を暗号学的乱数で新規生成し、モデルへ値を出力せず直接秘密設定へ渡した。ファイル・Git・チャット・TickTickへ値を保存していない。DB内部接続URLとAPIの参照を未適用で保存し、pending差分は41件となった。get-staged-changesで値が伏せられた名前と非破壊の新規作成だけを照合した。既存秘密の読取り・変更はしていない。

RailwayのWeb設定画面ではReplica Limitsの調整欄が無効で、Trial既定CPU2/メモリ1GBを表示した。希望した0.5GB/1vCPUを設定できたとは扱わない。アカウントは引き続きTrial残30日/5ドルと表示され、起動・支払い追加・upgradeは行っていない。公開URL、実DB適用、CORS_ORIGIN、入口制限、復旧手順の確認が残る。実DBへの9migrationと架空4人の投入・E2Eについて、対象を限定して会話上で個別承認を確認中である。

追加CLIを含む同じAPI imageと既存Web image de8524e1で、ローカル23項目E2Eすべて成功した。Chrome158.0.8127.37、API応答123件でno-store不足0、page error0、意図した拒否16件に対応するconsole出力16件。SQLはApproved/version7/判断2件/承認者1人。生結果はmigration-tools-e2e.jsonとmigration-tools-sql.txtへ保存した。API再起動中にWebの接続拒否が2回あり、その後200と画面・履歴の復帰が成功した。その他のAPI level50/60は記録されていない。専用Compose、proxy、browserを終了しtmpfs DBを破棄した。

実装差分と最終記録の独立AIレビューはいずれも指摘なし。人間による受け入れではない。今回の公開準備で変更した依存は既存CLIの本番への分類のみで、解決版・業務API・認可・DB schema/migrationファイル・CI/Harness検証基準を変えていない。標準検証の再実行では415試験・型検査・通常本番build・文体/秘密検査すべて成功した。ログは/private/tmp/miniflow-deploy-tools-validation-final.log。lintは従来どおりskip、依存脆弱性監査とCI自動E2Eは未整備。実RailwayでのDB適用とE2Eは未実施で、個別承認待ちの範囲は継続する。
