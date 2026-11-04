# GitHub Actionsによる検証仕様

- 目的: PRとmainに対して、ローカルと同じ自動検証の結果をGitHub上に残す。
- 対象: 同一repositoryのPR、mainへのpush、手動実行。fork、deploy、migration、ブラウザ試験、監査の定期実行は対象外。

## 受け入れ条件

- AC1: 同一repositoryのPRとmainの更新、手動操作で既存Project Profileを実行する。
- AC2: HarnessはMiniFlowのgitlinkと同じrevisionを使い、別のprivate repositoryに対する専用の読み取り権限だけで取得する。認証情報を後続の処理・ログ・cacheへ保存しない。
- AC3: forkのコードへprivate Harnessと専用secretを渡さない。forkでの検証が対象外であることを文書に明示する。
- AC4: secretがない、Harness取得が失敗、依存準備が失敗、既存の必須検証が失敗した場合、検証jobは失敗になる。検証を省略して成功にしない。
- AC5: 初回のクリーンrunnerで依存準備・Prisma生成・型検査・全テスト・build・書式と秘密情報検査を完了できる。DB接続や既存ユーザーは必要としない。
- AC6: 外部Actionを固定SHAで使い、jobを読み取り権限・20分の上限で動かす。deploy、書き込み、自動commitは行わない。

- 入力・エラー: secretの値はGitHub Actionsの安全な設定先だけで扱う。不足時は設定キー名だけを示し、値を表示しない。gitlinkは160000と40桁SHAだけを許可し、任意のURLを取得しない。
- 決定: 会話で案Aの採用を承認済み。発行主体・期限・設定実施の時期は運用者が決める。GitHub Appへ切り替える場合は再計画する。
- 関連: [計画](../work/ci-validation/plan.md)、[機能試験](../tests/functional/ci-validation.md)、[単体試験](../tests/unit/ci-harness-ref.md)。
- 最終更新: 2026-11-04、承認済み草案から移動した。
