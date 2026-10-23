# デプロイ手順（Vercel・Neon・GitHub ログイン・Vercel Blob・Google ログイン）

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

## 6. 画像の保存先（Vercel Blob）を作る【M2】

M2（画像の投稿）の PR をマージする前に、1 回だけ行います。秘密の値を自分で入力する必要はありません。

1. Vercel のプロジェクト画面で「Storage」タブを開く
2. 「Create Database」（または「Create」）を押し、「Blob」を選んで進む
3. 次のように設定する。**あとから変えられない**ので注意してください
   - Access: **Public**（公開）。画像を URL で配信するため。投稿は誰でも見られるので問題ありません（Private を選ぶと、画像の保存がエラーになります）
   - Name: `sns-learn-images`（自由な名前で OK）
   - Region: 選べる場合は **Singapore**（サーバーや DB と同じ場所）
4. 環境（Environments）は **Production と Preview** を選ぶ（最初から選ばれていればそのまま。Development は選んでも選ばなくても構いません）
5. 「Create」（または「Connect」）を押す

これで、プロジェクトに `BLOB_STORE_ID` などの環境変数が自動で追加されます。

環境変数は、この後に作られるデプロイから使われます。すでにある M2 の PR のプレビューで試すときは、「Deployments」タブで、その PR のデプロイの「…」→「Redeploy」を押してください。

## 7. プレビュー環境で確かめる【M2】

PR ごとに作られるプレビュー環境で、マージ前に動作を確かめます。

1. PR の画面で、Vercel のコメント（またはチェック欄）にある「Preview」の URL を開く。Vercel へのログインを求められたらログインする
2. 「GitHub でログイン」を押す。GitHub の画面のあと、一度本番の URL を経由してプレビューに戻ってきて、ログインできていれば OK
3. 画像を 1〜2 枚付けて投稿し、表示されることを確かめる
4. 設定画面でアイコンを変えてみる

うまくいかないときは、プレビューのデプロイの「Logs」（Runtime Logs）の赤い行を、秘密の値が含まれていないことを確かめたうえでチャットに貼ってください。

- プレビューで投稿した内容が本番にも表示される場合は、Neon の「プレビュー用に DB のブランチを作る」設定がオフになっています（手順 2-4）。その場合は教えてください
- リンクのプレビュー（OGP）は、本番にマージしてから確かめます。プレビュー環境は Vercel へのログインが必要なので、LINE などのサービスからは中身を読めません

## 8. Google ログインの設定【M3】

M3 の PR をマージする前に、1 回だけ行います。Google Cloud の画面は、スマホでは「PC 版サイトを表示」にすると操作しやすくなります。画面が英語のときは、かっこ内の表記を探してください。

### 8-1. プロジェクトを作る

1. https://console.cloud.google.com/ を開き、Google アカウントでログインする（利用規約への同意を求められたら同意する。料金の支払い設定は不要です）
2. 画面上部のプロジェクト名の部分（「プロジェクトを選択」（Select a project））を押し、「新しいプロジェクト」（New project）を押す
3. プロジェクト名を `SNS-learn` にして「作成」（Create）を押し、作ったプロジェクトを選ぶ

### 8-2. ログイン画面の設定（Google Auth Platform）

1. 左上のメニュー（≡）→「Google Auth Platform」を開く（見つからなければ、上部の検索欄に「Google Auth Platform」と入力する）
2. 「開始」（Get started）を押し、次のように入力して進む
   - アプリ名（App name）: `SNS-learn`
   - ユーザー サポートメール（User support email）: 自分のメールアドレス
   - 対象（Audience）: **外部**（External）
   - 連絡先情報（Contact information）: 自分のメールアドレス
   - ポリシーに同意して「作成」（Create）
3. 左のメニューの「対象」（Audience）を開き、「テストユーザー」（Test users）の「+ Add users」で、**ログインに使う自分の Gmail アドレス**を追加して保存する
   - 公開の状態が「テスト中」（Testing）の間は、ここに追加した人しか Google でログインできません。一般公開する前（M4）に「アプリを公開」（Publish app）で本番の状態に切り替えます

### 8-3. OAuth クライアントを作る

1. 左のメニューの「クライアント」（Clients）→「+ クライアントを作成」（Create client）を押す
2. 次のように入力する（`〇〇` は手順 1-6 でメモした本番の URL）
   - アプリケーションの種類（Application type）: **ウェブ アプリケーション**（Web application）
   - 名前（Name）: `SNS-learn`
   - 承認済みのリダイレクト URI（Authorized redirect URIs）の「+ URI を追加」: `https://〇〇.vercel.app/api/auth/callback/google`
3. 「作成」（Create）を押す
4. 表示された **クライアント ID**（Client ID）と **クライアント シークレット**（Client secret）をコピーしておく。シークレットは、あとから表示できないことがあるので、すぐに次の手順で Vercel に入力してください

リダイレクト URI の設定が反映されるまで、5 分〜数時間かかることがあります。

### 8-4. Vercel に環境変数を設定する

手順 4 と同じ画面（Vercel の「Settings」→「Environment Variables」）で、次の 2 つを追加します。Environments は **Production と Preview** の両方を選んでください。

| Key | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | 手順 8-3 のクライアント ID |
| `GOOGLE_CLIENT_SECRET` | 手順 8-3 のクライアント シークレット |

環境変数は、次のデプロイから使われます。M3 の PR のプレビューで試すときは、「Deployments」タブで、その PR のデプロイの「…」→「Redeploy」を押してください。この 2 つが設定されるまでは、ログイン画面に Google のボタンは表示されません（ほかの機能は使えます）。

## 9. プレビュー環境で確かめる【M3】

1. PR の Vercel のコメントにある「Preview」の URL（`sns-learn-git-…` から始まる、ブランチごとの URL）を開く
   - パスキーは URL ごとに結びつくので、必ずこの URL を使ってください。デプロイごとの URL（ランダムな英数字が入ったもの）では、パスキーが使えません
2. GitHub でログインする（M2 で確かめられなかった「プレビュー環境でのログイン」の確認もこれで済みます）
3. 設定画面の「ログイン方法」で「パスキーを追加」を押し、指紋や顔認証でパスキーを作る
4. ログアウトして、ログイン画面の「パスキーでログイン」でログインできるか試す
5. 投稿の共有ボタン（四角から矢印が出ているアイコン）を押し、LINE などに送れるか試す

- **Google でのログインと連携は、プレビューでは試せません。** プレビューのログインは本番を経由するので、本番に M3（Google の設定）が入るまで動かないためです。マージ後に、下の「マージ後に本番で確かめる」で試してください
- プレビューで作ったパスキーは、プレビューでしか使えません。本番では、マージ後に本番の設定画面からもう一度追加してください

### マージ後に本番で確かめる

1. 本番の設定画面の「ログイン方法」で「Google と連携する」を押し、Google のアカウントを選んで連携する
2. ログアウトして、「Google でログイン」で同じアカウントに入れるか試す
3. 「パスキーを追加」で本番用のパスキーを作り、ログアウトしてから「パスキーでログイン」を試す
4. 投稿の共有ボタンで投稿のリンクを LINE などに送り、リンクのプレビュー（タイトル・本文・青い画像のカード）が出るか見る（M2 で試せなかった確認です）

### （任意）プレビュー用の DB が分かれているかを確かめる

Vercel の「Storage」タブ → Neon のデータベース →「Open in Neon」を押し、Neon の画面の左のメニューの「Branches」を開きます。`preview/` から始まる名前のブランチがあれば、プレビューには本番のコピーの DB が使われています（安心してプレビューで試せます）。`main`（または `production`）しかなければ、プレビューも本番の DB を使っています。Neon の無料枠ではブランチは 10 個までなので、古い `preview/` のブランチが増えてきたら削除してください。

## 2 回目以降

- main にマージすると、自動で本番にデプロイされる（DB のテーブル変更も自動で適用される）
- PR を作ると、PR ごとのプレビュー環境が作られ、PR に URL がコメントされる（見るには Vercel へのログインが必要）
