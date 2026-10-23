# SNS-learn

X（旧Twitter）のような、テキスト中心の SNS を作る学習プロジェクトです。

- いちばんの目的は学習。ただし品質は落とさず、モックも使わず、本番で運用できるものを作る
- 無料枠の範囲だけで運用する（カード登録なし）
- 開発は Claude Code が担当し、オーナーはスマホからレビュー・動作確認・マージを行う

## ドキュメント

| 内容 | 場所 |
| --- | --- |
| 進め方と進捗 | [docs/ROADMAP.md](docs/ROADMAP.md) |
| 要件定義 | [docs/requirements.md](docs/requirements.md) |
| 設計判断の記録（ADR） | [docs/adr/](docs/adr/README.md) |
| 学習ノート | [docs/learning/](docs/learning/) |
| デプロイ手順 | [docs/deploy.md](docs/deploy.md) |

## 技術スタック

Next.js 16（App Router）/ TypeScript / Vercel / Neon（PostgreSQL）/ Drizzle ORM / Vercel Blob / sharp / Better Auth / Tailwind CSS / Zod / Vitest / Playwright / GitHub Actions

選んだ理由は [ADR-0002（技術スタック）](docs/adr/0002-tech-stack.md)、[ADR-0003（認証方式）](docs/adr/0003-authentication.md)、[ADR-0007（Cache Components）](docs/adr/0007-cache-components.md)、[ADR-0008（画像の保存）](docs/adr/0008-image-storage.md) にあります。

## 開発（Claude の作業環境向け）

```bash
pnpm install
pnpm db:local     # PostgreSQL を起動
pnpm test         # 単体テスト・結合テスト
pnpm test:e2e     # E2E テスト
```

環境変数は [.env.example](.env.example) を参照してください。
