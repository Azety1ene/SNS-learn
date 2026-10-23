# デプロイ手順（Vercel・Neon・GitHub ログイン）

オーナーがスマホのブラウザで行う設定の手順です。最初に 1 回だけ行えば、以降は main にマージするたびに自動で本番に反映されます。

画面の表記が変わっていて手順どおりに進めない場合は、どの画面で止まったかをチャットで教えてください。

> ⚠ API キーなどの秘密の値は、チャットに貼らないでください。各サービスの設定画面に直接入力します。

## 全体の流れ

1. Vercel にプロジェクトを作る（最初のデプロイは失敗しますが、正常です）
2. Neon（DB）をつなぐ
3. GitHub の OAuth アプリを作る
4. Vercel に環境変数（秘密の値）を設定する
5. もう一度デプロイして、スマホでログインを試す

## 1. Vercel にプロジェクトを作る

1. https://vercel.com/signup を開き、「Continue with GitHub」でログインする（プランは無料の Hobby）
2. 「Add New…」→「Project」を選ぶ
3. 一覧の「SNS-learn」の「Import」を押す
   - 一覧に出ない場合は、Vercel の GitHub アプリに SNS-learn へのアクセスを許可する
4. 「Project Name」を決める。これが URL の一部になる（例: `sns-learn` → `https://sns-learn.vercel.app`。使われていれば別の名前になります）
5. ほかの設定は変えずに「Deploy」を押す
   - DB や秘密の値がまだないので、このデプロイは失敗します。正常なので次へ進んでください
6. 本番の URL（`https://〇〇.vercel.app`）を確認して、メモしておく（プロジェクトの「Domains」に表示されます）

## 2. Neon（DB）をつなぐ

1. Vercel のプロジェクト画面で「Storage」タブを開く
2. 「Create Database」→「Neon」を選んで進む
3. 次のように設定する
   - Region: **Singapore**（`aws-ap-southeast-1`）。Neon には東京がないため、日本から一番近い場所を選ぶ。サーバー（Vercel）もシンガポールに置く設定にしてある（`vercel.json`）
   - Plan: **Free**
4. 作成したら、このプロジェクトにつなぐ（Connect）。環境は Production・Preview・Development のすべてを選ぶ
   - Preview 用に「デプロイごとに DB のブランチを作る」設定があればオンにする（PR ごとに本番 DB のコピーで確認できるようになる）

これで `DATABASE_URL` などの環境変数が自動で設定されます。

## 3. GitHub の OAuth アプリを作る

1. https://github.com/settings/developers を開き、「OAuth Apps」→「New OAuth App」を押す
2. 次のように入力する（`〇〇` は手順 1-6 でメモした本番の URL）
   - Application name: `SNS-learn`
   - Homepage URL: `https://〇〇.vercel.app`
   - Authorization callback URL: `https://〇〇.vercel.app/api/auth/callback/github`
3. 「Register application」を押す
4. 表示された **Client ID** をコピーしておく
5. 「Generate a new client secret」を押し、表示された **Client secret** をコピーする（一度しか表示されません）

プレビュー環境でも、本番の URL を経由してこの OAuth アプリでログインできます（ADR-0003）。

## 4. Vercel に環境変数を設定する

Vercel のプロジェクト画面で「Settings」→「Environment Variables」を開き、次の 3 つを追加します。Environments は **Production と Preview** の両方を選んでください。

| Key | Value |
| --- | --- |
| `BETTER_AUTH_SECRET` | 32 文字以上のランダムな文字列（作り方は下に） |
| `GITHUB_CLIENT_ID` | 手順 3-4 の Client ID |
| `GITHUB_CLIENT_SECRET` | 手順 3-5 の Client secret |

`BETTER_AUTH_SECRET` の作り方:

- パスワード管理アプリ（iPhone の「パスワード」、Google パスワードマネージャー、1Password など）で強力なパスワードを作り、それを貼る
- 32 文字に足りない場合は、2 つ作ってつなげれば OK
- この値はログインの Cookie に署名するための鍵です。誰にも見せず、どこにも保存しないでください（Vercel に入れたら、手元のメモは消して大丈夫です）

`BETTER_AUTH_URL` は設定しないでください（Vercel 上では URL が自動で決まるようになっています）。

## 5. もう一度デプロイする

1. Vercel のプロジェクト画面で「Deployments」タブを開く
2. 一番上のデプロイの「…」→「Redeploy」を押す
3. 「Ready」になったら、本番の URL をスマホで開く
4. 「GitHub でログイン」→ 許可 → @ID と表示名を決める → 投稿してみる

うまくいかないときは、Vercel のデプロイ画面にあるログ（Build Logs や Runtime Logs）の赤い行を、秘密の値が含まれていないことを確認したうえでチャットに貼ってください。

## 2 回目以降

- main にマージすると、自動で本番にデプロイされる（DB のテーブル変更も自動で適用される）
- PR を作ると、PR ごとのプレビュー環境が作られ、PR に URL がコメントされる（見るには Vercel へのログインが必要）
