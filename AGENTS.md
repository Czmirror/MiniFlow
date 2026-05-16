## AI Context

- 作業開始前に `.ai-context/hot.md` を読む。
- `.ai-context/hot.md` は現在の作業対象、優先事項、制約、触らない範囲を示す短期コンテキストとして扱う。
- `Current Constraints` に書かれているdomain ruleを優先する。
- `Ignore For Now` に書かれている項目は、明示的な指示がない限り実装しない。
- `.ai-context/hot.md` の内容と既存コード・テストが矛盾する場合は、勝手に修正せず、差分と懸念点を報告する。
- `.ai-context/` 配下のファイルは、明示的に指示された場合を除き編集しない。
