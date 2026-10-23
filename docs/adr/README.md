# 設計判断の記録（ADR）

ADR（Architecture Decision Record）は、設計上の大事な判断を「背景・決定・理由・影響」の形で残す文書です。コードを読んでも「なぜそうしたか」は分からないので、ここに書いて残します。

- 書き方は [ADR-0001](0001-record-architecture-decisions.md) にあります
- 一度決めた ADR は書き換えません。方針を変えるときは新しい ADR を追加し、古いものを「置き換え済み」にします

| 番号 | タイトル | 状態 |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | 設計判断を ADR として記録する | 承認 |
| [0002](0002-tech-stack.md) | 技術スタック | 承認 |
| [0003](0003-authentication.md) | 認証方式 | 承認 |
| [0004](0004-development-workflow.md) | 開発の進め方 | 一部置き換え済み（ADR-0006） |
| [0005](0005-testing-policy.md) | テスト方針 | 承認 |
| [0006](0006-milestone-workflow.md) | 進め方の見直し（マイルストーンごとの PR・学ぶ内容の絞り込み） | 承認 |
| [0007](0007-cache-components.md) | Cache Components を使い、画面部品は Tailwind CSS で作る | 承認 |
| [0008](0008-image-storage.md) | 画像は DB で枠を予約してから Vercel Blob に保存する | 承認 |
