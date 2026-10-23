import { expect, test } from "./support/fixtures";

test("ログインしていない人には案内が表示され、みんなの投稿を読める", async ({
  page,
  createUser,
  createPost,
}) => {
  const alice = await createUser({ name: "アリス" });
  await createPost(alice.id, "誰でも読める投稿です");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ようこそ SNS-learn へ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "GitHub でログイン" })).toBeVisible();

  await page.getByRole("link", { name: "ログインせずにみんなの投稿を見る" }).click();
  await expect(page.getByText("誰でも読める投稿です")).toBeVisible();
  // ログインしていないので、いいねは押せない
  await expect(page.getByRole("button", { name: "いいねする" })).toBeDisabled();
});

test("投稿の詳細ページとプロフィールを読める", async ({ page, createUser, createPost }) => {
  const alice = await createUser({ handle: "alice", name: "アリス" });
  const postId = await createPost(alice.id, "詳細ページの投稿");

  await page.goto(`/posts/${postId}`);
  // ページのタイトルにも本文が入るので、投稿の中を探す
  await expect(page.getByRole("article").getByText("詳細ページの投稿")).toBeVisible();
  await expect(page.getByText("すると返信できます。")).toBeVisible();

  await page.goto("/u/alice");
  const profile = page.getByRole("region", { name: "プロフィール" });
  await expect(profile.getByRole("heading", { name: "アリス" })).toBeVisible();
  await expect(profile.getByText("@alice", { exact: true })).toBeVisible();
  await expect(page.getByRole("article").getByText("詳細ページの投稿")).toBeVisible();
});

test("存在しないページでは「ページが見つかりません」と表示する", async ({ page }) => {
  for (const path of ["/u/nobody_here", "/posts/999999", "/posts/not-a-number"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  }
});

test("下までスクロールすると、続きの投稿を読み込む", async ({ page, createUser, createPost }) => {
  const alice = await createUser();
  for (let i = 1; i <= 25; i++) {
    await createPost(alice.id, `連続投稿 ${i}`);
  }

  await page.goto("/explore");
  // 最初は新しい 20 件だけ
  await expect(page.getByText("連続投稿 25", { exact: true })).toBeVisible();
  await expect(page.getByText("連続投稿 5", { exact: true })).toHaveCount(0);

  // 一番下までスクロールすると、残りの 5 件が足される
  await page.getByRole("button", { name: "もっと見る" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("連続投稿 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(25);
});
