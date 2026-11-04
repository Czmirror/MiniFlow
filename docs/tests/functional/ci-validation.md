# CI導入の機能試験仕様

- 対象: [仕様](../../specs/ci-validation.md)。実行環境はGitHub-hostedの使い捨てrunner。

| ID | 条件 | 手順と期待結果 | 結果 |
| --- | --- | --- | --- |
| FT1 | AC1・AC5 | 同一repositoryのPRでクリーン環境から準備と既存検証を実行し、GitHubのチェック結果へ成功が残る | 未実施 |
| FT2 | AC1 | mainへマージ後のpushと手動実行でも同じProfileを使う | 未実施 |
| FT3 | AC2・AC6 | 固定SHA、read権限、credential非永続化、gitlinkとcheckoutの一致を差分・ログで照合する。秘密の値は読まない | 未実施 |
| FT4 | AC3 | forkを除外する条件と、secretが取得stepだけに渡ることを独立レビューする。実際のforkで確認できなければ未検証とする | 未実施 |
| FT5 | AC4 | secretなし・取得失敗・必須検証失敗で安全に失敗する経路を確認する。共有secretを削除したり、本番mainを意図的に壊したりしない | 未実施 |
| FT6 | AC6 | timeout20分、deploy・書き込み・cache・artifact・自動修正がないことを差分で照合する | 未実施 |

アプリのロジックは変更しない。gitlinkの形式検証は[単体試験](../unit/ci-harness-ref.md)で扱う。コードとCIの失敗を区別し、未実施を成功と記録しない。

- 最終更新: 2026-11-04、承認済み草案から移動した。
