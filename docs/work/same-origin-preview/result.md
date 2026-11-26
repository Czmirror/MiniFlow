# Webを唯一の入口にした結果

画面とAPIを同じ公開入口へ接続できるよう、Docker Webに内部APIへの固定転送を追加した。公開先の作成はまだ行っていない。PR32は最新CI成功・レビュー指摘なし・未解決threadなしを確認し、aa44b21へマージ済み。今回の新PRは未マージでHumanReview待ちとする。

## 変更と判断

[計画](plan.md)の1〜4と[仕様](../../specs/same-origin-preview.md)のAC1〜4を対象とする。実装70bb85dで、Docker用Next設定のrewritesだけに固定http://api:3001を指定した。転送先をrequestのpath/query/headerから作らず、利用者が任意URLへ転送する機能はない。通常のbuildではrewritesは空のまま。APIの認証/認可/Origin/CSRF/DB/本文の処理は維持した。

ComposeはAPIのhost側公開portを削除し、APIが受けるHostを内部api:3001だけにした。試験proxyの旧API分岐は削除し、TLS→Web→APIの経路で本番転送を検証する。固定DBのseed用loopbackは残るため、試験Composeを公開用へ流用しない。

自己レビューではNext設定が配信条件、Composeが試験ネットワーク、proxyがTLS試験入口という責務を照合した。冒頭説明と固定先のコメントが実装と一致し、業務処理や重複proxy実装は増えていない。security/data/tests/docs-commentsの観点を使用。aa44b21..70bb85dの独立AIレビューも指摘なし。AI確認を人間受け入れとしない。

## 標準検証と成果物

`node --check tests/support/containerProxy.mjs`、Profile検証成功。実行計画確認後、`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`を実行し、407テスト/32ファイル・型検査・通常本番build・文体/秘密検査が成功した。通常buildのroutes-manifest.jsonでrewritesが空であることを確認した。

Web Dockerbuildも成功。同じimageで実動確認する。image `sha256:7279941bdcb19f1baa1f5bf38d519250860bdc472cd40f270c8fe644e14edf3c`、Next build ID `H681znoK5ysRCUE3dlbK-`。実行中manifestのafterFilesに固定/api/:path*→http://api:3001/:path*、beforeFiles/fallbackは空。APIは前回と同じimage `sha256:e6e88eac6747a795d25675306a166bbd9355a8d391518b977abf9068783971af`を再利用した。

公開向けの性能目標は未定。追加転送の負荷/latency・複数architectureは未検証。依存追加・lockfile・CI/Harness設定変更はない。lintは既存skip、依存監査/CI自動E2Eは未整備。

## 実際の接続

固定localhost HTTPS入口を経由し、APIのPortBindingsは空objectで直接公開portなしを確認した。Web経由の/api/auth/me?fixture=forwardedは401、不正Originのloginは403、両方no-store。入口の未知Hostは403。HTMLは200/no-cache/noindex/nofollow、JS/CSS7件は全200/immutableを確認した。公開TLSやCDNを試験した結果ではない。

実装70bb85dと同じWeb imageでChrome158.0.8127.37/Playwright1.65.1の23項目がすべて成功した。API応答123件でno-store不足0、意図した拒否401×9/403×4/400×3、対応するconsole16件、page error0、予期しないブラウザHTTP拒否0。[E2E生結果](e2e-evidence.json)・[HTTP照合](http-evidence.json)・[SQL照合](sql-evidence.txt)を保存した。

再起動試験のAPI起動時刻08:09:17.938 UTCに対し、復帰pollの08:09:18.064/18.200 UTCでWebの接続拒否が2回記録された。API起動直後の一時不通で、その後のpoll200と画面/履歴の復帰が成功した。これをエラーなしとは扱わず、予定した再起動中の出力として記録する。他のAPI level50/60、未処理例外は見つからなかった。再起動を無停止にする変更は対象外。

SQLはusers5件、本人ja/sessionVersion1、管理対象Approver/team-2/無効、禁止ユーザー0件、申請Approved/version7/判断2件/承認者1人。専用Compose/proxy/browserを終了し、tmpfs DB・試験証明書を削除した。標準407テストとローカル23項目E2Eは別の試験で、後者はCIに含まれない。FT1〜4成功。

## 残課題

公開DNS・信頼されたTLS・入口のアクセス制限・公開先のheader保持・共有デモの復旧運用は未検証。API_HOSTを内部固定にしただけで公開入口のHost検証を代替したとは扱わず、配信基盤でも許可した公開Hostへ制限する。内部HTTPは信頼された私設ネットワークだけに限定する。

画面の変更はないため視覚設計図比較は適用外。DB schema変更なし、既存9migrationの適用先は事前に個別承認された固定localhost:55449/miniflow_container_testの空tmpfsだけ。既存workspaceや実データは変更しない。ユーザーの2026-11-26依頼に基づき、前回の同じ専用DB初期化承認を再利用した。人間の実画面確認と公開受け入れは未実施。

範囲外で新たに見つけた問題はなし。次は公開先とアクセス制限・デモ復旧運用を具体化する。repository LICENSEと外部配布時の表示条件の最終確認も残っており、今回はimageの外部配布を行わない。
