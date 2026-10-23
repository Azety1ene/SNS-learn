import { expect, test } from "./support/fixtures";

test("フォローすると、その人の投稿がホームに表示される", async ({
  page,
  createUser,
  createPost,
  signInAs,
}) => {
  const bob = await createUser({ handle: "bob", name: "ボブ" });
  await createPost(bob.id, "ボブの近況です");
  await signInAs(await createUser({ name: "アリス" }));

  await page.goto("/");
  await expect(page.getByText("ボブの近況です")).toHaveCount(0);

  await page.goto("/u/bob");
  await page.getByRole("button", { name: "フォローする" }).click();
  await expect(page.getByRole("button", { name: "フォロー中" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1 フォロワー" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("ボブの近況です")).toBeVisible();
});

test("初回登録がまだの人は、ID と表示名を決めるとホームへ進める", async ({
  page,
  createUser,
  signInAs,
}) => {
  await signInAs(await createUser({ handle: null, name: "GitHubの名前" }));

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("表示名")).toHaveValue("GitHubの名前");

  await page.getByLabel("ユーザーID").fill("New_User");
  await page.getByLabel("表示名").fill("新しい人");
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("投稿の本文")).toBeVisible();
  await page.goto("/u/new_user");
  await expect(page.getByRole("heading", { name: "新しい人" })).toBeVisible();
});

test("すでに使われている ID では登録できない", async ({ page, createUser, signInAs }) => {
  await createUser({ handle: "taken" });
  await signInAs(await createUser({ handle: null }));

  await page.goto("/onboarding");
  await page.getByLabel("ユーザーID").fill("taken");
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "このIDはすでに使われています" }),
  ).toBeVisible();
  // 登録できなかったので、初回登録ページにとどまる
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("プロフィールを編集でき、ログアウトもできる", async ({ page, createUser, signInAs }) => {
  const alice = await createUser({ handle: "alice", name: "アリス" });
  await signInAs(alice);

  await page.goto("/settings");
  await page.getByLabel("表示名").fill("アリス（編集後）");
  await page.getByLabel("自己紹介").fill("よろしくお願いします");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByRole("status")).toHaveText("保存しました");

  await page.goto("/u/alice");
  await expect(page.getByRole("heading", { name: "アリス（編集後）" })).toBeVisible();
  await expect(page.getByText("よろしくお願いします")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("button", { name: "GitHub でログイン" })).toBeVisible();
});
