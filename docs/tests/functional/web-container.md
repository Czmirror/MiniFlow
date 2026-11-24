# Webコンテナの機能試験

[Webコンテナ仕様](../../specs/web-container.md)を、ローカル専用のWeb/API/PostgreSQLで確認する。実施者はAI。2026-11-25。

| ケース | 条件 | 操作と期待結果 | 結果 |
| --- | --- | --- | --- |
| WFT1 | WC1/WC6 | 固定image/lockfileでDocker buildし、通常のローカルbuildも成功 | 成功 |
| WFT2 | WC2 | ダミー.env/鍵を置いてbuildし、build/runtimeの固定pathに存在しない | 成功 |
| WFT3 | WC3/WC6 | 非root/read-onlyで起動しHTML/CSS/JS、image/Next build ID、HTMLのno-cacheと検索除外、staticのimmutableを照合 | 成功 |
| WFT4 | WC4/WC5 | 同一Origin /apiから既存22項目を実ブラウザで確認し、SQL保存も照合 | 成功 |

TLSは固定localhostの自己署名証明書を隔離contextだけで許容する。公開DNS/TLS、複数ブラウザ、性能目標は未検証。結果は[作業記録](../../work/preview-web-container/result.md)へ残す。
