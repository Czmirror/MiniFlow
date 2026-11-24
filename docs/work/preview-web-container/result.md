# Webコンテナの検証記録

2026-11-25。Webを本番用コンテナとして配布できるようにした。公開環境の作成はまだ行っていない。PR #30はCI成功・レビュー指摘なし・未解決threadなしを確認し、`2a61f42`へマージ済み。

## 変更と判断

[計画](plan.md)と[仕様](../../specs/web-container.md)の範囲で、Web専用Dockerfile/context、Docker時だけのstandalone設定、既存ComposeへのWebを追加した。API/DB schema/依存/公開API/UIの変更はない。ホームページの別作業は元workspaceに保持した。

公式Node22のdigestとlockfileを固定し、未知のinstall scriptは停止。実行時はuid1000、read-only、権限追加なし。API接続先は公開build引数で既定`/api`。通常のホストbuildにはstandaloneを要求しない。16MiBの/tmpはローカル試験用の仮の上限であり、公開先の容量設計ではない。

## ビルドと配信

- 実装revision `f20ac0f`、image `sha256:6920bc381a6e74c43149f60e91ead03b261b5f1f82c4eadd71f9129b4d8d41f9`、Next build ID `Gxz_sPpRNlHH5_8ymIfpy`。
- arm64 image size 322,809,915 bytes。性能目標/複数architecture/負荷試験は未実施。性能改善とは判定しない。
- ダミー.env/鍵を置いてbuildした。builderの固定7pathとruntimeの固定6pathで混入なし。runtimeの/appへの書込みはEROFS、uid1000。
- HTML200・no-cache・X-Robots-Tag noindex/nofollow。CSS/JSの7ファイルは全200/immutable。ダミー設定/鍵のURL3件は404。初回に見つけた入口HTMLの長期cacheと検索除外不足はheader設定で修正し、再buildして実HTTPで確認した。

## 標準検証

`node .harness/upstream/scripts/validate-config.mjs`成功。実行計画確認後、`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`成功。31ファイル404テスト・型検査・本番build・秘密検査・文体検査を確認。通常buildにはMINIFLOW_STANDALONEを指定せず、WC6も確認した。lintと依存脆弱性監査は既存Profile対象外で未実施。

## 実動検証

Web/API/PostgreSQLを専用Composeで起動し、固定localhost HTTPSから隔離Chromeで既存22項目を確認する。承認済みの同じlocalhost:55449/miniflow_container_testだけに既存9migrationと架空4人を投入。実データ・外部DB・OSの証明書信頼は変更していない。

初回は15項目成功後、本人設定の2つ目のログインでheadingの描画待機15秒が失敗した。失敗時のaria snapshotにはheadingがあり、Web/APIのerror出力はなかった。原因は断定せず、完了した業務/管理contextを本人設定の前に解放する最小変更を追加した。期待値とtimeoutは維持し、DBを破棄/再作成して最初から再実行する。再実行は失敗を消すものではなく、変更後の回帰確認として記録する。

変更後revision `b5b1579`で22項目すべて成功。Chrome158.0.8127.37/Playwright1.65.1、Web/API/DBはコンテナ、本番モードのCookie/CSRF/チーム分離/管理/本人設定を確認した。[E2E生結果](e2e-evidence.json)、[HTTP照合](http-evidence.json)、[SQL照合](sql-evidence.txt)を保存する。意図したHTTP拒否16件（401×9、403×4、400×3）、console出力16件はこれらに対応し、page error0・予期しないHTTP拒否0。API/Webのlevel50/60、Unhandled、Error出力はなし。

SQLではusers5件、申請Approved/version7/判断2件/承認者1人、本人表示名「E2E 本人設定」/ja/sessionVersion1、管理対象Approver/team-2/isActive=false、不正作成ユーザー0件。専用Composeは終了時に削除し、HTTPS proxy・ブラウザを終了、試験証明書も削除した。全WFT1〜4成功。標準404テストと今回のブラウザ22項目は別の検証で、後者はCIに含まれない。

## レビューと残課題

自己レビューではDockerfileは組立、専用ignoreは入力境界、Next設定は成果物の配信、Composeは試験接続という責務を照合した。業務処理や試験の複製、既存期待値の弱体化はない。security/data/tests/docs-commentsの観点を使用。独立レビューは`2a61f42..f20ac0f`の11ファイルで指摘なし。追加の`f20ac0f..b5b1579`も指摘なし。期待値とエラー記録が維持されることを確認した。

ユーザーの2026-11-25依頼が公開準備とE2Eの出典。DB初期化は前回の「投入して良いです、DB初期化への個別承認します」の同じ固定専用環境を再利用した。今回の画面変更はなく、視覚設計図比較は適用外。AI確認は人間受け入れと区別し、新規PRはHumanReview待ちとする。

次の優先項目は、公開先で同一OriginのHTTPS入口と/api転送を整え、共有デモの架空データの復元方法を決めること。公開DNS/TLS・公開先のCookie/CORS・複数ブラウザ・CI自動E2Eは未検証。公開URLを用意するまで第三者への操作公開は未完了。
