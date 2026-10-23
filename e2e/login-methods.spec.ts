import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { E2E_BASE_URL } from "./support/config";
import { expect, test } from "./support/fixtures";

/** ページの JavaScript の準備（ハイドレーション）が終わるまで待つ。終わる前に押したボタンは反応しないため */
async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle");
}

test("パスキーを追加すると、ログアウトしたあとパスキーでログインできる", async ({
  page,
  context,
  db,
  createUser,
  signInAs,
}) => {
  // 本物の端末の代わりに、Playwright の仮想の認証器（パスキーを保存する装置）を使う
  await context.credentials.install();
  const alice = await createUser({ name: "アリス" });
  await signInAs(alice);

  await page.goto("/settings");
  await waitForHydration(page);
  await page.getByRole("button", { name: "パスキーを追加" }).click();
  const passkeys = page.getByRole("list", { name: "登録したパスキー" }).getByRole("listitem");
  await expect(passkeys).toHaveCount(1);

  // DB には公開鍵だけが保存され、端末側（仮想の認証器）には秘密鍵が保存されている
  const { rows } = await db.query<{ user_id: string; public_key: string }>(
    "select user_id, public_key from passkeys",
  );
  expect(rows).toEqual([{ user_id: alice.id, public_key: expect.any(String) }]);
  expect(await context.credentials.get({ rpId: "localhost" })).toHaveLength(1);

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("button", { name: "パスキーでログイン" })).toBeVisible();

  await page.goto("/login");
  await waitForHydration(page);
  await page.getByRole("button", { name: "パスキーでログイン" }).click();
  // ログインできたら、ホームへ移動して投稿フォームが表示される
  await expect(page).toHaveURL(`${E2E_BASE_URL}/`);
  await expect(page.getByLabel("投稿の本文")).toBeVisible();
});

test("削除したパスキーではログインできない", async ({ page, context, createUser, signInAs }) => {
  await context.credentials.install();
  await signInAs(await createUser());

  await page.goto("/settings");
  await waitForHydration(page);
  await page.getByRole("button", { name: "パスキーを追加" }).click();
  const passkeys = page.getByRole("list", { name: "登録したパスキー" }).getByRole("listitem");
  await expect(passkeys).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^パスキー「.+」を削除$/ }).click();
  await expect(passkeys).toHaveCount(0);

  // サーバーからは消えたが、端末にはパスキーが残っている。それを使おうとしても断られる
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.goto("/login");
  await waitForHydration(page);
  await page.getByRole("button", { name: "パスキーでログイン" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "このパスキーは登録されていません" })).toBeVisible();
});

test("外部アカウントの連携を解除できる。最後の 1 つは解除できない", async ({
  page,
  db,
  createUser,
  signInAs,
}) => {
  const alice = await createUser();
  for (const providerId of ["github", "google"]) {
    await db.query(
      "insert into accounts (id, user_id, provider_id, account_id) values ($1, $2, $3, $4)",
      [randomUUID(), alice.id, providerId, randomUUID()],
    );
  }
  await signInAs(alice);

  await page.goto("/settings");
  await waitForHydration(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Google との連携を解除" }).click();

  await expect(page.getByRole("button", { name: "Google と連携する" })).toBeVisible();
  // 残りは GitHub だけなので、解除のボタンは出ない
  await expect(page.getByRole("button", { name: "GitHub との連携を解除" })).toHaveCount(0);
  const { rows } = await db.query("select provider_id from accounts where user_id = $1", [alice.id]);
  expect(rows).toEqual([{ provider_id: "github" }]);
});

test("ログイン画面に GitHub・Google・パスキーのボタンがあり、失敗の理由を案内する", async ({
  page,
}) => {
  await page.goto("/login?error=account_not_linked");
  await expect(page.getByRole("button", { name: "GitHub でログイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Google でログイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "パスキーでログイン" })).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "別のログイン方法ですでに登録されています" }),
  ).toBeVisible();
});

test("投稿の共有ボタンで、投稿のリンクをコピーできる", async ({
  page,
  context,
  createUser,
  createPost,
}) => {
  const alice = await createUser();
  const postId = await createPost(alice.id, "共有してね");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // この試験では、OS の共有メニューがないブラウザ（パソコンなど）の動きを確かめる
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
  });

  await page.goto("/explore");
  await waitForHydration(page);
  await page.getByRole("button", { name: "投稿のリンクを共有" }).click();

  await expect(page.getByRole("status").filter({ hasText: "リンクをコピーしました" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${E2E_BASE_URL}/posts/${postId}`,
  );
});
