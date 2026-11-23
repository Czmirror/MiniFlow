# APIの本番コンテナの準備結果

APIをNode 22系でビルドし、非rootでJavaScriptの成果物を起動するimageへ置き換えた。開発起動を公開環境へ持ち込まないための変更。公開先・Web・TLS・DBの構築とデプロイは未実施である。

## 実装と試験

2026-11-23、AIがDocker Desktop上のLinux/arm64で確認した。

- FT1 / AC1: `docker build -f apps/api/Dockerfile -t miniflow-api:preview-local .`成功。公式Node imageのmulti-platform digestと既存lockfileを使用した。lifecycle scriptを止め、Prisma Clientを明示生成してコンパイルした。
- FT2 / AC2: 最終imageでNode v22.23.5、UID 1000、NODE_ENV=production、Prisma 6.19.2、fastify-plugin 5.1.0を確認した。直接のtsx・TypeScript・Vitest、src、.git、.envは存在しなかった。起動コマンドは`node dist/main.js`。
- FT3 / AC3: ダミーcontextに必要入力6件と、.env・入れ子の.env・秘密鍵・Git・Harness・テスト・Web・node_modulesの不要入力9件を置いた。`FROM scratch`のCOPYで実際のcontextをローカルへ書き出し、必要6件だけ残ることを確認した。実秘密は使用していない。
- FT4 / AC4: 秘密・ネットワークなしの起動では`JWT_SECRET is required`で終了コード1となり、待ち受けを開始しなかった。
- FT5 / AC4: 架空の本番設定で、read-only filesystem、/tmpだけtmpfs、capabilityなし、no-new-privileges、init、loopback公開で起動した。未認証/auth/meは401、未知Hostは403、正規OriginのPATCH preflightは204で明示Originとcredentialsを返した。DB URLは接続できない試験専用のloopback portを指定し、DB操作を行っていない。試験コンテナは停止・削除済み。

最終ローカルimageは`sha256:0bf60396ee858bc82fb73f995aaa4cbc1b4101643bb80b0f6902b81f06940937`、470,456,726バイト。このIDは配信済みartifactではない。buildログにはpnpmのlegacy deployに関する既知の警告と更新案内があった。固定済みworkspaceの設定を変えずに本番依存を分離するためlegacyを使い、更新案内には従っていない。

## 見つけた問題と修正

初回の実起動は、本番HTTP pluginが直接importするfastify-pluginが開発依存に分類されていたため失敗した。同じversionのまま本番依存へ移し、lockfileの分類だけを更新した。新しいnpm packageやversion変更はない。既存の検証では本番依存だけの起動が抜けていたため、FT4・FT5で実imageの起動を確認した。

初回context検査では親directoryの再許可によりWebのダミーファイルが残った。親の下を再度除外し、API・共有型の必要箇所だけを許可するよう修正した。context検査と本番image buildをやり直して成功した。最初の外部pathの検査用DockerfileはDockerの一時path権限で読めなかったため、ダミーcontext内へ置いて検査した。

## 全体検証とレビュー

Harnessの書式、全workspace/rootの型検査、31ファイル392件のテスト、本番build、秘密情報の限定パターン検査が成功した。単体試験はDockerfileを文字列で写すだけになるため追加せず、機能試験で実物を検証した。CIの基準は変えていない。

自己レビュー: Dockerfileはbuildとruntimeの成果物境界を持ち、.dockerignoreは入力の選別を担当する。既存API・起動設定を再利用し、認証や業務ルールの複製・変更はない。元workspaceのホームページ変更は保護した。migrationの作成・適用、DB操作、クラウド変更は行っていない。

独立AIレビュー（`c2840f2`→`bcc1afb`）は指摘なし。Security・Tests・Docs and commentsの観点で、AC1〜AC4と差分・記録を照合した。Docker/検証の独立再実行はしておらず、主担当の実行証拠との静的整合性の確認である。人間レビューは未実施で、状態はHumanReview待ち。

## 残課題と次の優先項目

Webの配信成果物と、同一サイトのHTTPS構成・アクセス制限付き配信先を整える。公開先でTLS、Secure Cookieの受理、実DBへの承認フローを確認する必要がある。不特定多数向けのログイン試行制限・共有資格情報の改変対策・データ初期化は引き続き未整備で、今回のimageを公開デモ完成とは扱わない。

別architectureのimage、実DB接続、公開先の動作、脆弱性監査、Dockerの自動CI試験は未検証/未整備。主要依存（Fastify・fastify-plugin・bcryptjs・Prisma Client）のLICENSEは最終image内で確認した。依存packageとbase imageのライセンス文は保持するが、repositoryのLICENSE選択・image外部配布に必要な表示の最終確認は公開方法を決める段階に残る。今回ユーザーへ後日行う設定作業は依頼していない。
