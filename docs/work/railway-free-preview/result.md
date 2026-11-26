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
