# CLAUDE.md

このリポジトリで作業する Claude への引き継ぎメモ。セッションは毎回まっさらな状態で始まるので、作業前に必ず読むこと。

## プロジェクト

- X（旧Twitter）風のテキスト中心 SNS を作る。最大の目的はオーナーの学習
- 学習用でも品質は落とさない。製品コードにモックやダミー実装を入れない。最終的に本番で運用する
- 無料枠だけで運用する（カード登録なし）
- 進捗と次のマイルストーン: `docs/ROADMAP.md`（チェックリストが進捗の正）
- 要件: `docs/requirements.md` ／ 設計判断: `docs/adr/` ／ 学習ノート: `docs/learning/` ／ デプロイ手順: `docs/deploy.md`

## オーナーについて

- 実務経験あり。Next.js を勉強中
- 学び方は「Claude が書いたコード・PR・学習ノートを読んで理解する」。質問は PR のコメントかチャットで来る
- 操作はスマホのみで、コマンドは実行できない。動作確認は Vercel の URL、コードは GitHub アプリで読む
- 外部サービスの設定（Vercel、Neon、OAuth アプリの登録など）はオーナーがスマホで行う。手順はボタンや画面の名前まで具体的に案内する
- 秘密情報（API キーなど）をチャットに貼ってもらわない。必ず各サービスの設定画面に直接入力してもらう

## 進め方（ADR-0006）

- PR はマイルストーン（M1〜M4 と発展機能）ごとに 1 本。細かく分けすぎない
- 学ぶテーマは 2 つ。Next.js の「サーバーとブラウザの分担」（Server Components／Client Components／Server Actions）と、DB の設計とクエリ（オーナーの希望で、DB は実装も解説もしっかり行う。インデックスなどは EXPLAIN で測って判断し、結果をノートに載せる）
- PR には「まず読むファイル（5 つ程度）」と「読まなくてよいファイル」を書く
- 学習ノートはテーマごとに分ける（例: 01 サーバーとブラウザ、02 データベース）。要点を絞り、DB は計測結果も含めて詳しく書く
- 品質は落とさない。テスト・CI・セキュリティ対策は必ず入れる（ただし読むことは求めない）

## 作業の流れ

1. `docs/ROADMAP.md` で次のマイルストーンを確認する
2. 最新の main から作業ブランチを作る（例: `m2/images`）。main へ直接 push しない
3. 実装とテストを書く。push 前に `pnpm lint`・`pnpm typecheck`・`pnpm test`・`pnpm test:e2e` を通す
4. 学習ノートを追加し、ROADMAP のチェックを更新する
5. PR を作る（`.github/pull_request_template.md` の形式、日本語）
6. オーナーの確認・質問に対応する。マージはオーナーが行う

## よく使うコマンド

```bash
pnpm db:local        # 作業環境の PostgreSQL を起動（セッション開始時に自動で実行される）
pnpm dev             # 開発サーバー（DATABASE_URL などの環境変数が必要。.env.example を参照）
pnpm lint            # ESLint
pnpm typecheck       # 型チェック（ルートの型を生成してから tsc）
pnpm test            # 単体テスト・結合テスト（本物の PostgreSQL の sns_test を使う）
pnpm test:e2e        # E2E テスト（ビルドして起動し、Chromium で操作。DB は sns_e2e）
pnpm db:generate     # src/db/schema.ts の変更からマイグレーションを作る（DATABASE_URL が必要）
```

- E2E テストを作業環境で動かすときは `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` が必要（セッション開始時に自動で設定される）

## 書き方

- PR・学習ノート・ADR・コミットメッセージは日本語
- オーナーへの返事は、作業の途中の短い報告も含めて、すべて日本語で書く
- コミットメッセージは `種類: 内容`（例: `feat: 投稿の削除機能を追加`）。種類は feat / fix / docs / refactor / test / chore / ci
- 識別子（変数名など）は英語。コメントは日本語で「なぜそうしているか」を書く
- 学習ノートは、そのマイルストーンで初めて出てくる概念を「なぜ必要か → どう動くか → このコードのどこか」の順で説明する
- 図は Mermaid で書き、スマホで読めるよう縦長（`flowchart TD` など）にする

## コードの構成

- `src/app/`: ページ（URL ごとのファイル）。ページは async にせず、DB や Cookie を読む部分を `<Suspense>` で囲む（ADR-0007）
- `src/features/<機能>/`: 機能ごとのコード
  - `queries.ts`: DB からの読み取り（`server-only`）
  - `mutations.ts`: DB への書き込みとルールの確認。「誰が」を引数で受け取る（テストしやすくするため）
  - `actions.ts`: Server Actions。本人確認 → 入力チェック → mutations を呼ぶ → `refresh()` だけの薄い層
  - `validation.ts`: Zod による入力ルール（画面とサーバーで共用）
  - `components/`: 画面の部品
- `src/features/media/`: 画像（ブラウザでの縮小、sharp での変換、保存先、上限の予約、使われていない画像の片付け）。posts と users の mutations から呼ぶ
- `src/features/login-methods/`: ログイン方法（GitHub・Google・パスキー）のボタンと、設定画面での連携・解除・パスキーの管理
- `src/lib/`: 共通の部品（認証の設定、セッションの取得、文字数の数え方、サイトの URL など）
- `src/db/`: テーブル定義と DB 接続

## 技術スタック

Next.js 16（App Router、Cache Components）/ TypeScript / Vercel / Neon（PostgreSQL）/ Drizzle ORM / Vercel Blob と sharp（M2 から）/ Better Auth（GitHub・Google の OAuth とパスキー。パスワードなし）/ Tailwind CSS / lucide-react / Zod / Vitest / Playwright / GitHub Actions / pnpm

- 理由は ADR-0002（技術スタック）、ADR-0003（認証方式）、ADR-0007（Cache Components）、ADR-0008（画像の保存）、ADR-0009（ログイン方法と連携）
- Next.js 16 は学習データと違う点が多い。Next.js の機能を使うときは `node_modules/next/dist/docs/` の該当ページを先に読む（`AGENTS.md` を参照）

## DB のルール

- テーブル定義の変更は `src/db/schema.ts` を直してから `pnpm db:generate` で `drizzle/` にマイグレーションを作る（`DATABASE_URL=postgres://postgres@127.0.0.1:5432/sns_dev` を付ける）
- main にマージ済みのマイグレーションは書き換えない。直したいときは新しいマイグレーションを足す
- 守るべきルールは、アプリ（Zod）と DB の制約の両方に入れる。DB のエラーコードは `src/lib/errors.ts` で分かりやすいメッセージに変える
- 書き込みはできるだけ 1 文で完結させる（`on conflict do nothing`、条件付きの `update`／`delete` など）。複数の文が必要なら `db.transaction` でまとめる
- インデックスは `EXPLAIN ANALYZE` で測ってから足し、結果を学習ノートに載せる
- `media`（画像）は論理削除（`deleted_at`）。使用中の画像だけを扱うときは `deleted_at is null` を付ける。画像のファイルは「どこからも使われていない画像」を探して消す（`deleteUnusedMedia`、ADR-0008）

## テスト方針（ADR-0005）

- DB をモックしない。テストは本物の PostgreSQL で動かす（作業環境ではローカルの PostgreSQL 16、CI ではサービスコンテナ）
- 自動テストで通れない外部のログイン画面（GitHub など）だけは、ログイン済みの状態（セッションと署名付き Cookie）を直接作って代わりにする（`e2e/support/fixtures.ts`）
- 画像の保存先は、テストと E2E ではディスク（`LOCAL_STORAGE_DIR`）。Vercel Blob にはつながない
- パスキーは、E2E で Playwright の仮想の認証器（`context.credentials.install()`）を使って本当に登録・ログインする（`e2e/login-methods.spec.ts`）。E2E では Google の環境変数に仮の値を入れて、ボタンを表示させている
- E2E でファイルを選ぶときは、ボタンを押して filechooser で選ぶ（`e2e/images.spec.ts` の `chooseFiles`）。ハイドレーション前の操作は無視されるため

## 作業環境の注意

- このクラウド環境からは Vercel や Neon に直接つながらない。デプロイは Vercel の GitHub 連携に任せる
- コンテナは時間が経つと消えるので、作業途中でも push して残す
- リポジトリは public。秘密情報は絶対にコミットしない
- ローカルで投稿した画像は `.local-storage/` に保存される（git には入らない）

## 無料枠の注意

- Vercel Blob はアップロード等が月 2,000 回、保存 1GB まで。画像機能は必ず上限のガードとセットで作る（上限の値は `src/features/media/mutations.ts`）
- Neon は保存 0.5GB、DB ブランチ 10 個まで。5 分アクセスがないと休止し、次のアクセスで自動的に再開する
- サーバー（Vercel）と DB（Neon）はどちらもシンガポールに置く（Neon に東京がないため。`vercel.json`）
- 上限の一覧は `docs/requirements.md` の「6. 制約（無料枠）」にある
