# SNS-learn

X（旧Twitter）のような、テキスト中心の SNS を作る学習プロジェクトです。

- いちばんの目的は学習。ただし品質は落とさず、モックも使わず、本番で運用できるものを作る
- 無料枠の範囲だけで運用する（カード登録なし）
- 開発は Claude Code が担当し、オーナーはスマホからレビュー・動作確認・マージを行う

## ドキュメント

| 内容 | 場所 |
| --- | --- |
| 手順と進捗 | [docs/ROADMAP.md](docs/ROADMAP.md) |
| 要件定義 | [docs/requirements.md](docs/requirements.md) |
| 設計判断の記録（ADR） | [docs/adr/](docs/adr/README.md) |
| 学習ノート | [docs/learning/](docs/learning/) |

## 技術スタック

Next.js（App Router）/ TypeScript / Vercel / Neon（PostgreSQL）/ Drizzle ORM / Vercel Blob / Better Auth / Tailwind CSS / shadcn/ui / Vitest / Playwright / GitHub Actions

選んだ理由は [ADR-0002（技術スタック）](docs/adr/0002-tech-stack.md) と [ADR-0003（認証方式）](docs/adr/0003-authentication.md) にあります。
