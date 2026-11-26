# Webの本番コンテナ

Web画面を公開先へ運べる成果物として作り、ホストの開発サーバーを使わずに既存業務を確認する。公開配信先・TLS終端・DNS・共有デモの運用構築は対象外。UI/認証/認可/APIは変更しない。

| ID | 受け入れ条件 |
| --- | --- |
| WC1 | 既存APIと同じdigest固定の公式Node22とlockfileからbuildする。未知のlifecycle scriptは実行しない |
| WC2 | Web専用contextに.env・秘密鍵・Git・Harness・ローカルnode_modules・テストを含めない。ダミーを置いて混入しないことを確認する |
| WC3 | 非rootでbuild済みstandalone serverを直接起動し、NODE_ENV=production。read-onlyの試験環境でHTML/staticが応答する。プレビューは検索除外し、入口HTMLはno-cache、ハッシュ付きstaticはimmutableで配る |
| WC4 | APIの公開接続先はbuild時に指定し、既定は同一Originの`/api`。秘密やDB設定をWebへ渡さない。build後の環境変数変更ではクライアント接続先は変わらない |
| WC5 | Web/API/実PostgreSQLと固定localhost HTTPSで既存22項目が成功する。API再起動後の認証・保存とCookie/CSRF/権限境界を維持する |
| WC6 | Docker用のstandalone出力切替は通常のローカルbuild/startに影響させない。配布物のNext build IDとimage IDを確認できる |

`MINIFLOW_STANDALONE=1`はDocker buildだけで指定する内部の出力切替。PORT/HOSTNAMEはNode serverの待受設定で、コンテナの既定は3000/0.0.0.0。Docker Webは[同一Origin接続](same-origin-preview.md)で/apiを内部APIへ転送する。TLS入口は配信先で別途必要。今回のTLSはローカル試験専用で、実公開証明書の検証ではない。

2026-11-25作成。[計画](../work/preview-web-container/plan.md)、[機能試験](../tests/functional/web-container.md)。
