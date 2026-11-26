# Railway無料枠の準備結果

Railwayを公開先として選んだため、Webが専用の内部DNSへ接続できる実装を追加した。無料枠のアカウント接続は未完了で、まだ公開URLは作成していない。接続待ちでも可能な単体・本番build・ローカルDNS alias検証を実施し、同じPR33へまとめる。

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

Railwayは未インストール/未接続と確認した。関連ツールを検索して接続方法を提示し、重複タスクなしを確認してTickTickへ「MiniFlow公開準備：Railwayを無料枠で接続する」を作成済み。期限/通知/繰り返しは設定していない。資格情報は受け取っていない。

接続後にアカウントのFree/Trialと残枠を確認し、[設定表](../../railway-preview.md)のWeb/api/PostgreSQLの3サービスを準備する。有料upgradeや支払い方法追加はしない。実DB migration・架空ユーザー投入は、localhostの承認を流用せず、対象を提示して個別承認後に実施する。公開入口のアクセス制限・Host・信頼されたTLS・公開先E2E・データ復旧方法が未確認なら、資格情報を不特定多数へ公開しない。

無料枠の稼働/sleep/復帰/容量/消費と実HTTPSの確認は未実施。ローカル成功を実公開の証拠にしない。負荷性能の目標は未定で、常設稼働を保証しない。実Railwayの接続・公開部分はBlocked、ローカル実装はHumanReview待ちとして分ける。

DB schemaとmigrationファイルは変更なし。既存9migrationの今回の適用先は、個別承認済み固定localhost:55449/miniflow_container_testの空tmpfsだけ。元workspaceのホームページ変更を保護している。画面変更はなく視覚設計比較は適用外。公開時のLICENSE/表示条件と人間による実画面確認は残る。新しい範囲外問題はなし。
