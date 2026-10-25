# MiniFlow Harness

AI開発の入口はルートのAGENTS.md。業務ルールと優先事項はsteering/project.mdを正本とし、旧.ai-context/hot.mdは変更せず履歴として残す。

## 導入元

- Repository: https://github.com/Czmirror/ai-dev-context
- Commit: 0656986cebd23d5e19c8cac30b822bd755babf7f
- 入手日: 2026-10-25
- ライセンス: MIT。ライセンス本文はupstream/LICENSEに保持。
- 方式: Git submodule。upstreamへの改変なし。アプリの依存・API・DB変更なし。

## 初期化・検証

```sh
git submodule update --init --recursive
node .harness/upstream/scripts/validate-config.mjs
node .harness/upstream/scripts/validate.mjs
node .harness/upstream/scripts/validate.mjs --execute
```

clone時はgit clone --recurse-submodulesを使用する。Node.js 22以上と既存のpnpm環境が必要。最後のコマンドはproject.jsonの検証を実行する。lintは未整備のため理由付きでskip。他の必須チェックは失敗を隠さない。

更新はupstreamでfetchし、差分をレビューして対象commitへ移動し、設定検査・dry run・実行検証後に親repositoryの参照commitを記録する。導入先からupstreamのルールを直接編集しない。

## 移行時の確認

- ユーザーの2026-10-25の依頼に基づきsubmodule導入とhot.md参照の切り替えを実施。
- 元のhot.mdの権限制約・画面タイトル・優先順位・未確定事項・MVP範囲・対象外項目をsteering/project.mdに保持。実装との整合性を保証する更新は行っていない。
- 設定検査とdry runは成功。既存Markdownの行末空白によりformat checkは失敗。既存文書の一括整形は行っていない。
- 新規sessionでのルール発見・承認前停止の確認: 未実施（NOT RUN）。Runnerの結果とは区別する。

検証結果（導入差分に対して2026-10-26実施）: pnpm typecheck成功、Vitest 7ファイル72件成功、pnpm build成功、Harnessのsecrets検査成功、git diff --check成功。Runner全体は既存文書のformat違反により失敗。AI自己レビューではhot.mdの本文移行・旧文書不変更・共通Harness不変更・参照先を照合した。人間の受け入れは未確認。
