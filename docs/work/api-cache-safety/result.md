# API応答の保存禁止の結果

公開時の個人情報保護のため、認証・申請・管理などのAPI応答をHTTP cacheへ保存しない指定を追加した。画面操作や権限は変更していない。PR31は最新CI成功・未解決threadなしを確認し、f97044aへマージ済み。今回の新規PRはHumanReview待ちとし、自動マージしない。

## 実装と照合

対象はf97044aから実装commit 63e4a35まで。[計画](plan.md)、[仕様](../../specs/api-cache-safety.md)、[機能試験](../../tests/functional/api-cache-safety.md)のAC1〜3に対応する。組立の送信hookでAPI全体にno-storeを設定し、CSRF routeだけの旧指定は削除した。本文・status・Cookie・認可・DB schema・依存・CI設定の変更はない。

自己レビューではHTTP組立のtransport方針として配置し、業務層へ依存を増やしていないことを確認した。冒頭説明の責務を広げず、hookのコメントは認証情報を残さない理由と実行時機を説明する。試験は本番HTTPを呼び、保存先だけを置換する。E2Eの観測配列はプロセス中だけ存在し、資格情報・本文・header生値は保存しない。security/data/tests/docs-commentsの観点を使用。独立AIレビューもf97044a..63e4a35で指摘なし。これは人間の受け入れではない。

## 標準検証

変更前の追加3試験はheader不足で失敗し、変更後は3試験すべて成功した。`node --check tests/e2e/containerWorkflow.mjs`、`validate-config.mjs`成功。実行計画を確認後に`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`を実行し、32ファイル407テスト・型検査・本番build・文体・秘密検査がすべて成功した。lintはProfileの既存skip、依存脆弱性監査とCI自動E2Eは未整備。分岐を増やさない送信方針のため単体仕様を重複作成せず、本番HTTPの機能試験で契約を確認した。

## 本番コンテナの実動

API image `sha256:e6e88eac6747a795d25675306a166bbd9355a8d391518b977abf9068783971af`、arm64、470456981 bytes。既存Web imageを再利用し、固定localhost HTTPSと専用PostgreSQL16でChrome/Playwrightから実施した。性能目標は未定で、性能改善や負荷耐性は判定しない。公開先のCDN/TLSではない。

DBはユーザーが個別承認した同じlocalhost:55449/miniflow_container_testに限定し、空のtmpfsへ既存9migrationと架空4人を投入した。共有DB・実データ・OS証明書信頼は変更していない。実装63e4a35で23項目すべて成功した。Chrome158.0.8127.37/Playwright1.65.1でAPI応答123件を観測し、no-store不足0件。既存22項目の成功と保存禁止の追加1項目を区別して記録する。[生結果](e2e-evidence.json)・[SQL照合](sql-evidence.txt)を保存した。意図したHTTP拒否は401×9/403×4/400×3、対応するconsole16件、page error0、予期しないHTTP拒否0。API/Webのlevel50/60、Unhandled、Error出力はなし。

SQLではusers5件、Approved/version7/判断2件/承認者1人、本人設定ja/sessionVersion1、管理対象Approver/team-2/無効、禁止ユーザー0件を照合した。専用Compose/proxy/browserを終了し、tmpfs DB・試験証明書を削除した。標準407テストとローカル23項目E2Eは別の検証で、後者はCIに含めていない。FT1〜3成功。

## 残課題と次の優先項目

公開先・DNS・信頼されたTLS、共有デモの復旧運用、公開先でAPIのno-storeが上書きされないことは未検証。既に保存されたcache、画面・履歴・メモリの消去を保証する変更ではない。画面変更はないため視覚設計比較は適用外。

新たな範囲外問題はなし。次はアクセスを制限した公開先の同一サイトHTTPS構成とデータ復旧手順を具体化する。配布・公開のライセンス条件確認もその段階に残る。今回の公開準備とE2Eは2026-11-25のユーザー依頼、専用DB操作は前回の「投入して良いです、DB初期化への個別承認します」を同じ対象へ再利用した。人間の画面確認は未実施。
