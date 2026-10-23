# CLAUDE.md

このリポジトリで作業する Claude への引き継ぎメモ。セッションは毎回まっさらな状態で始まるので、作業前に必ず読むこと。

## プロジェクト

- X（旧Twitter）風のテキスト中心 SNS を作る。最大の目的はオーナーの学習
- 学習用でも品質は落とさない。製品コードにモックやダミー実装を入れない。最終的に本番で運用する
- 無料枠だけで運用する（カード登録なし）
- 進捗と次のステップ: `docs/ROADMAP.md`（チェックリストが進捗の正）
- 要件: `docs/requirements.md` ／ 設計判断: `docs/adr/` ／ 学習ノート: `docs/learning/`

## オーナーについて

- 実務経験あり。Next.js を勉強中
- 学び方は「Claude が書いたコード・PR・学習ノートを読んで理解する」。質問は PR のコメントかチャットで来る
- 操作はスマホのみで、コマンドは実行できない。動作確認は Vercel のプレビュー URL、コードは GitHub アプリで読む
- 外部サービスの設定（Vercel、Neon、OAuth アプリの登録など）はオーナーがスマホで行う。手順はボタンや画面の名前まで具体的に案内する
- 秘密情報（API キーなど）をチャットに貼ってもらわない。必ず各サービスの設定画面に直接入力してもらう

## 作業の流れ

1. `docs/ROADMAP.md` で次のステップを確認する
2. 最新の main から作業ブランチを作る（例: `step/1-1-nextjs-scaffold`）。main へ直接 push しない
3. 実装とテストを書く。push 前に lint・型チェック・テストを実行して通す
4. 学習ノートを追加・更新し、ROADMAP のチェックを更新する
5. PR を作る（`.github/pull_request_template.md` の形式、日本語）
6. オーナーの確認・質問に対応する。マージはオーナーが行う

## 書き方

- PR・学習ノート・ADR・コミットメッセージは日本語
- コミットメッセージは `種類: 内容`（例: `feat: 投稿の削除機能を追加`）。種類は feat / fix / docs / refactor / test / chore / ci
- 識別子（変数名など）は英語。コメントは日本語で「なぜそうしているか」を書く
- 学習ノートは、そのステップで初めて出てくる概念を「なぜ必要か → どう動くか → このコードのどこか」の順で説明する
- 図は Mermaid で書き、スマホで読めるよう縦長（`flowchart TD` など）にする

## 技術スタック

Next.js（App Router）/ TypeScript / Vercel / Neon（PostgreSQL）/ Drizzle ORM / Vercel Blob / Better Auth（Google・GitHub の OAuth＋パスキー、パスワードなし）/ Tailwind CSS / shadcn/ui / Zod / Vitest / Playwright / GitHub Actions / pnpm

理由は ADR-0002（技術スタック）と ADR-0003（認証方式）。

## テスト方針（ADR-0005）

- DB をモックしない。テストは本物の PostgreSQL で動かす（作業環境には PostgreSQL 16 がある。CI ではサービスコンテナを使う）
- 自動テストで通れない外部のログイン画面（Google/GitHub）だけは、ログイン済みの状態を DB に直接作って代わりにする

## 作業環境の注意

- このクラウド環境からは Vercel や Neon に直接つながらない。デプロイは Vercel の GitHub 連携に任せる
- コンテナは時間が経つと消えるので、作業途中でも push して残す
- リポジトリは public。秘密情報は絶対にコミットしない

## 無料枠の注意

- Vercel Blob はアップロード等が月 2,000 回、保存 1GB まで。画像機能は必ず上限のガードとセットで作る
- Neon は保存 0.5GB、DB ブランチ 10 個まで。5 分アクセスがないと休止し、次のアクセスで自動的に再開する
- 上限の一覧は `docs/requirements.md` の「6. 制約（無料枠）」にある
