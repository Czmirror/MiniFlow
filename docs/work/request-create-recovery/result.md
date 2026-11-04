# 申請作成後の復帰の実施結果

作成成功後に提出や詳細取得が失敗しても、作成済み申請のIDを保持して詳細へ復帰するよう修正した。
新規作成のやり直しではなく、同じ申請の状態確認・提出を使う。
自動検証は成功した。ブラウザ操作が環境設定で無効のため、実画面の確認は未実施である。

## 対象と承認

- 対象: mainの`c4be8c5`に対する今回のローカル差分。開始時の未追跡ファイルは前回作成した計画・草案のみ。
- 2026-11-04にfetch成功、HEADとorigin/mainは一致。既存ユーザー変更なし。
- 同日の会話で提示済み計画への「良いです」を受領した。範囲は[計画](plan.md)と[仕様](../../specs/request-create-recovery.md)のAC1〜AC6。
- API・DB・依存・権限・ログは変更していない。migration適用、push、deploy、実ユーザー作成は行っていない。

## 実装とレビュー

| 計画項目 | 対象と根拠 | 結果・限界 |
| --- | --- | --- |
| K1・AC1 | `runRequestCreation`は作成応答後、提出前に`onCreated`を同期実行する。画面はここでID保持、入力初期化、詳細の読み込み表示へ移る | 単体試験UT1成功。後続失敗で作成画面へ戻す処理はない |
| K1・AC2 | 提出失敗は`submission-unknown`で作成済みIDと区別する。画面は提出結果不明を説明し、詳細をGETする。提出を自動再送しない | UT2・UT3成功。Draft/Pendingの実操作はFT2・FT3未実施 |
| K1・AC3 | 詳細取得前から`detailId`を保持し、過去の`selectedRequest`と履歴を空にする。失敗時は`detailFailed`を設定し、既存の`onRetry`で同じIDを取得する | 差分と既存`RequestDetailView`の接続を確認。再試行のブラウザ操作は未実施 |
| K1・AC4 | 作成失敗は`creation-unknown`。作成通知も提出も行わず、入力を残して一覧確認を案内する | UT4成功。401・境界変更では既存の初期化を優先する |
| K2・AC5 | `requestInFlight`を通信前に設定して同一操作を排他にする。内部移動は作成画面でもbusyを渡し、callbackでもrefを確認する。旧完了の画面更新は操作token・認証世代・詳細世代で拒否する | UT5の古い応答破棄が成功。連打のDOM操作は未実施 |
| K2・AC5 | 401は既存`handleApiError`へ渡し、旧操作の`finally`は`isCurrent`が真のときだけ表示を解除する。tokenの解除は同一tokenのときだけ行う | 差分を確認。新操作のtokenを旧`finally`で消す処理はない。ブラウザでの認証変更試験は未実施 |
| K3 | 作成・提出結果の分類は`requestCreation.ts`、画面状態の反映は`MiniFlowApp`、文言は`messages.ts` | 旧`createFromForm`の連続処理を置換。別用途の旧補助パネルは計画どおり未変更 |
| AC6 | 新しい説明は日英の同じキーに追加。既存の詳細・再試行・提出部品とCSSを再利用 | 型検査と既存の表示試験成功。1280px・390px・キーボード・focus・ブラウザconsoleは未確認 |

責務・コメントの意味レビュー: `RequestCreationResult`は作成未確認と提出結果不明を型で区別する。`runRequestCreation`のコメントは呼び出し順、同期通知、古い結果のnull、更新を自動再送しない契約と一致する。作成・詳細取得の世代を同じ操作が持つ理由を画面コードに記した。例外の生値・入力本文・cookieを新たに表示・記録する処理はない。新規のクラス・保存先・汎用インターフェースは追加していない。

自己レビューに`templates/review.md`とsecurity・data・tests・docs-commentsの観点を適用した。公開API、認可方式、新規外部送信先、DB、CIの変更がないため、独立レビュー必須の条件には当たらないと判断した。独立レビュー・人間の受け入れは未実施で、自己レビューと区別する。

## 検証

2026-11-04に`NEXT_TELEMETRY_DISABLED=1 node .harness/upstream/scripts/validate.mjs --execute`を実行した。実行前に設定検査と実行予定を確認した。

| 検証 | 結果 |
| --- | --- |
| validate-config | 成功、6件の検証定義が有効 |
| テキスト形式 | 成功 |
| workspace・rootの型検査 | 成功 |
| Vitest | 29ファイル347件成功。追加15件を含む |
| API・共有型・Next.js本番build | 成功 |
| 秘密情報の限定パターン検査 | 成功 |
| lint | 未整備のため既存設定どおりskip |
| ブラウザ機能試験FT1〜FT6 | 未実施。CUAがWork設定によるブラウザ無効を報告した |
| 実DB | 未実施。保存・API契約を変更しないため今回は対象外 |
| coverage率比較 | 未実施。既存の率を記録する設定がなく、率の改善・維持は断定しない |

実行ログはGit対象外の`.harness/reports/request-create-recovery-validation.log`。この結果は設定された自動検証の成功であり、全画面や本番運用の安全性の保証ではない。

ブラウザ試験では[検証スキル](</Users/admin/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/verification/SKILL.md>)の流れを使用する予定だった。入口は作成画面、更新先は既存API、保存先は架空のメモリ保存先、出口は同じ申請の詳細表示である。最初のブラウザ環境確認で無効設定が判明したため、検証用サーバーは起動していない。既存設定を迂回せず、APIへのブラウザ通信・メモリ保存先との一連の操作・表示・console検査はすべて未確認として残した。

## 文書と残件

- 仕様は`docs/specs/request-create-recovery.md`へ移動した。試験の草案は`docs/tests/functional`と`docs/tests/unit`へ分離し、草案の二重の正本を残していない。
- `docs/runbook.md`に保存結果不明・提出結果不明の復帰手順を追加した。`.harness/steering/project.md`に新規ファイルの役割を追加した。共通Harnessと`.ai-context`は未変更。
- 範囲外で新たに発見した問題はなし。古い画面の競合、作成応答消失に対する重複防止、CI、ログイン制限等は既存の計画末尾に記載済みで、今回修正していない。
- 作成APIの応答そのものが失われた場合、別タブ・再読み込み後の同内容作成は防げない。サーバー側の重複防止は別計画である。
- 状態: HumanReview待ち。自動検証済み、ブラウザ機能試験・見た目の受け入れは未確認。全ACの実動確認が完了したとは扱わない。
