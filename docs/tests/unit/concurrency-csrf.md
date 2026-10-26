# 第3段階の単体試験案

対象仕様: [API](../../API.md)。実施結果は以下。詳細入力値は実装時のtestコードに置く。

| ID | 対象 | 観点・期待結果 |
| --- | --- | --- |
| UT1 | Request/保存port | versionのrehydrate・遷移引継ぎ、全更新で取得versionを保存条件へ渡す |
| UT2 | PrismaRequestRepository | 条件一致increment、0件は409相当、履歴追加と状態更新の同一Tx、失敗rollback契約 |
| UT3 | csrf生成/検証 | 同session安定・別session分離・改ざん/短い/不正形式拒否、値をerrorへ含めない |
| UT4 | auth plugin/routes | session識別子の署名照合、CSRFのcookie/header/sessionの一致、GETでcookie不変 |
| UT5 | Web apiTransport | 取得Promise共有、失敗後再取得、認証初期化中の古い取得を再利用しない、401/403区別 |
| UT6 | イベント記録 | allowlist以外の値を出さず、commit前の成功ログなし、内部障害と拒否の区別 |

fakeで実DBの競合成功を保証しない。FT1〜FT4の実DB結果と区別する。テストは本番実装をimportし業務ロジックを複製しない。

## 対応testと実施結果

UT1/UT2: RequestVersions.spec.ts、RequestApprovalConsistency.spec.tsと専用DBのintegration script。UT3/UT4: CsrfSessions.spec.ts。UT5: SessionExpiry.spec.ts。UT6: OperationEvents.spec.ts。
追加・変更の4ファイル18件は診断実行（CLI timeout/hookTimeout各30秒、maxWorkers=1）で成功した。実際の各case所要時間は5秒以内であったが、この結果を標準設定の全体Runner成功へ流用しない。標準の全体回帰ではホスト高負荷により既存testを含めtimeoutが発生しており、最終結果は実施記録で区別する。
