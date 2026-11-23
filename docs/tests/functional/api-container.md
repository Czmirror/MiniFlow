# APIコンテナの機能試験

対象: [仕様](../../specs/api-container.md)。ローカルDockerのみ。設定とDB URLは架空の値を用い、共有DBへ接続しない。

| ケース | 条件 | 手順と期待結果 | 結果 |
| --- | --- | --- | --- |
| FT1 | AC1 | root contextからimageをbuildし、Prisma生成とAPIコンパイルが成功する | 成功 |
| FT2 | AC2 | image内のnode版・実行UID・開発依存不在を確認する | 成功 |
| FT3 | AC3 | ダミー.env・秘密鍵・Git/Harness/test等をcontextへ置き、COPYされないことを確認する | 成功 |
| FT4 | AC4 | 設定不足ならlisten前に終了コード1で停止する | 成功 |
| FT5 | AC4 | 架空の本番設定で起動し、未認証/auth/meが401、未知Hostが403となる | 成功 |

実TLS・ブラウザ・DB接続はこの試験の対象外。DBなしで起動できることとDBを使う業務処理の成功を混同しない。2026-11-23作成。

実施: AI、2026-11-23、Docker Desktop/Linux arm64。詳細と初回失敗・修正は作業結果を参照。
