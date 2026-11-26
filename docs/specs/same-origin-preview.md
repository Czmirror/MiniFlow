# 同一OriginのAPI接続

Docker Webを公開入口とし、ブラウザの/api要求を内部APIへ届ける。公開先/DNS/TLS/デモの運用は対象外。

- AC1: MINIFLOW_STANDALONE=1でbuildしたWebだけ、/api/:path*を固定http://api:3001/:path*へ転送する。接続先はrequestの値で変えない。通常のホストbuildは転送しない。
- AC2: Cookie・CSRF・method・query・status・no-storeを保ち、従来23項目がWeb経由で成功する。認証/認可/Origin検査はAPIの契約を維持する。
- AC3: 試験ComposeはAPIのportをhostへ公開しない。APIが受けるHostはapi:3001だけを許可する。TLS試験入口はWebだけに転送し、APIへ別経路を持たない。
- AC4: 画面HTML/staticの応答とcache、build IDを照合する。公開先の信頼されたTLSやCDNの成功と混同しない。

NEXT_PUBLIC_API_BASE_URLは既定/apiを使う。別API URLへの既存build引数は残すが、今回の構成では上書きしない。固定内部サービス名とportを変える場合は配信設定とAPI_ALLOWED_HOSTSを一緒に見直し、imageを再buildして検証する。秘密/DB設定はWebに渡さない。

2026-11-26。[計画](../work/same-origin-preview/plan.md)・[試験](../tests/functional/same-origin-preview.md)。
