import { expect, test } from "./support/fixtures";

test("投稿すると、ホームのタイムラインに表示され、再読み込みしても残っている", async ({
  page,
  createUser,
  signInAs,
}) => {
  const alice = await createUser({ name: "アリス" });
  await signInAs(alice);

  await page.goto("/");
  const composer = page.getByLabel("投稿の本文");
  await composer.fill("はじめての投稿です");
  await page.getByRole("button", { name: "投稿", exact: true }).click();

  await expect(page.getByRole("article").getByText("はじめての投稿です")).toBeVisible();
  // 投稿できたら入力欄は空に戻る
  await expect(composer).toHaveValue("");

  await page.reload();
  await expect(page.getByRole("article").getByText("はじめての投稿です")).toBeVisible();
});

test("280 文字を超えると投稿ボタンを押せない", async ({ page, createUser, signInAs }) => {
  await signInAs(await createUser());

  await page.goto("/");
  await page.getByLabel("投稿の本文").fill("あ".repeat(281));
  await expect(page.getByText("残り -1 文字")).toBeVisible();
  await expect(page.getByRole("button", { name: "投稿", exact: true })).toBeDisabled();
});

test("いいねすると数が増え、再読み込みしても保たれる", async ({
  page,
  createUser,
  createPost,
  signInAs,
}) => {
  const bob = await createUser({ name: "ボブ" });
  await createPost(bob.id, "いいねしてください");
  await signInAs(await createUser({ name: "アリス" }));

  await page.goto("/explore");
  await page.getByRole("button", { name: "いいねする" }).click();
  const liked = page.getByRole("button", { name: "いいねを取り消す" });
  await expect(liked).toHaveAttribute("aria-pressed", "true");
  await expect(liked).toHaveText("1");

  await page.reload();
  await expect(page.getByRole("button", { name: "いいねを取り消す" })).toHaveText("1");
});

test("返信すると、投稿の詳細ページに表示される", async ({
  page,
  createUser,
  createPost,
  signInAs,
}) => {
  const bob = await createUser({ name: "ボブ" });
  const postId = await createPost(bob.id, "返信を待っています");
  await signInAs(await createUser({ name: "アリス" }));

  await page.goto(`/posts/${postId}`);
  await page.getByLabel("返信の本文").fill("返信しました");
  await page.getByRole("button", { name: "返信", exact: true }).click();

  await expect(page.getByRole("region", { name: "返信" }).getByText("返信しました")).toBeVisible();
});

test("自分の投稿は削除できる", async ({ page, createUser, createPost, signInAs }) => {
  const alice = await createUser();
  await createPost(alice.id, "消す予定の投稿");
  await signInAs(alice);

  await page.goto("/");
  await expect(page.getByText("消す予定の投稿")).toBeVisible();
  // 確認ダイアログで「OK」を押す
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "投稿を削除" }).click();

  await expect(page.getByText("消す予定の投稿")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("消す予定の投稿")).toHaveCount(0);
});

test("他人の投稿には削除ボタンが出ない", async ({ page, createUser, createPost, signInAs }) => {
  const bob = await createUser();
  await createPost(bob.id, "ボブの投稿");
  await signInAs(await createUser());

  await page.goto("/explore");
  await expect(page.getByText("ボブの投稿")).toBeVisible();
  await expect(page.getByRole("button", { name: "投稿を削除" })).toHaveCount(0);
});
