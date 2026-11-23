# 公開用APIコンテナを整える

2026-11-23の会話「引き続き、公開プレビューに向けて準備を進めてください」の範囲で、既存Dockerfileの開発起動を本番成果物へ置き換える。公開先へのデプロイ・DB変更・新規PRのマージは行わない。

基点はPR #25をマージ後にfetchしたorigin/main `c2840f2`。既存のホームページ変更を保護し、別worktreeの`codex/preview-api-container`で作業する。PR #25は最終SHAのCI成功、レビュー指摘・未解決threadなしを確認し、ユーザーの明示指示でマージした。

1. [仕様](../../specs/api-container.md)AC1〜AC4に沿い、Node 22の公式Debian slimイメージをdigest固定する。Prismaに必要なOpenSSL/CAはDebian公式packageから入れる。npm依存の追加・version更新は行わない。本番で直接importする既存packageが開発依存に分類されていれば、同じversionのまま本番依存へ移す。
2. Dockerfileのbuild段階にコンパイル・本番依存の分離・Prisma生成を置く。runtime段階へ本番node_modules・dist・package.jsonだけをコピーし、非rootでnodeを直接実行する。
3. .dockerignoreはcontextの許可リストを担当する。ダミーの.env等を含む隔離contextで、送信される入力から除かれることを実buildで確認する。
4. ローカルDockerでbuild、非root/開発依存なし/Prisma読込、設定不足による停止、正常設定でのAPI応答を確認する。Profileを実行し、独立AIレビュー後に通常PRへまとめる。

Safety・Sensitive data→AC3のcontext/最終image検査。CI/CD・Libraries→AC1の公式配布元・固定参照・ignore-scriptsと明示生成。Quality→AC2/AC4の実コンテナ起動と既存Profile。仕様を写した文字列だけのunit testは作らず、機能試験へ証拠を残す。

Dockerfileは成果物の組立、.dockerignoreは入力の選別、runbookは運用手順を持つ。既存の起動設定・APIを再利用し、認証/業務処理やCI基準を変えない。外部I/OはDocker Hub・npm registry・Prismaの公式配布・Debian package取得と、ローカルDockerに限る。実秘密は使わない。

図は新たなアプリ内の状態・通信経路を変えないため省略。公開先のTLS/Cookie受理、実DBの確認は未実施と区別する。lint・依存脆弱性監査・Docker自動CI検証は未整備で、今回品質基準へ追加しない。戻す場合はDockerfile/context設定の前進修正を行い、公開先へ未検証imageを配信しない。

参考: [pnpm deploy](https://pnpm.io/10.x/cli/deploy)、[公式Node image運用](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)。pnpmのlegacy deployはworkspace全体のinject設定を変えず本番依存を分離するために使う。base imageと各依存のライセンス文は元のpackageに保持する。リポジトリのLICENSE選択や外部配布の最終判断は行わない。
