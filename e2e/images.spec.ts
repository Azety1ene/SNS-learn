import type { Locator } from "@playwright/test";
import sharp from "sharp";
import { expect, test } from "./support/fixtures";

type TestFile = { name: string; mimeType: string; buffer: Buffer };

/** テスト用の JPEG 画像（Playwright でファイルとして選ばせる形） */
async function jpegFile(name: string, width = 1200, height = 900) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
  return { name, mimeType: "image/jpeg", buffer };
}

/**
 * ボタンを押して開いたファイル選択の画面で、画像を選ぶ（利用者と同じ操作）。
 * ページの JavaScript の準備（ハイドレーション）が終わる前に押すと何も起きないので、開くまでやり直す
 */
async function chooseFiles(button: Locator, files: TestFile[]) {
  const page = button.page();
  await expect(async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 1000 });
    await button.click();
    await (await chooser).setFiles(files);
  }).toPass();
}

test("画像を 2 枚付けて投稿すると、説明（代替テキスト）付きで表示される", async ({
  page,
  createUser,
  signInAs,
}) => {
  await signInAs(await createUser({ name: "アリス" }));
  await page.goto("/");

  await chooseFiles(page.getByRole("button", { name: "画像を追加" }), [
    await jpegFile("sky.jpg"),
    await jpegFile("sea.jpg", 600, 900),
  ]);
  const attachments = page.getByRole("list", { name: "添付する画像" }).getByRole("listitem");
  await expect(attachments).toHaveCount(2);
  await page.getByLabel("1 枚目の画像の説明").fill("青い空");
  await page.getByLabel("投稿の本文").fill("写真を撮りました");
  await page.getByRole("button", { name: "投稿", exact: true }).click();

  const article = page.getByRole("article").filter({ hasText: "写真を撮りました" });
  const image = article.getByRole("img", { name: "青い空" });
  await expect(image).toBeVisible();
  await expect(article.getByRole("img", { name: "画像 2" })).toBeVisible();
  // 画像が実際に読み込めている（保存したファイルが配信されている）
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);
  // 投稿できたら、添付した画像の一覧も空に戻る
  await expect(attachments).toHaveCount(0);
});

test("画像は 4 枚まで。選びすぎたら知らせ、取り除くこともできる", async ({
  page,
  createUser,
  signInAs,
}) => {
  await signInAs(await createUser());
  await page.goto("/");

  const files = await Promise.all([1, 2, 3, 4, 5].map((n) => jpegFile(`${n}.jpg`, 400, 300)));
  await chooseFiles(page.getByRole("button", { name: "画像を追加" }), files);

  await expect(page.getByRole("alert").filter({ hasText: "画像は4枚までです" })).toBeVisible();
  const attachments = page.getByRole("list", { name: "添付する画像" }).getByRole("listitem");
  await expect(attachments).toHaveCount(4);
  await expect(page.getByRole("button", { name: "画像を追加" })).toBeDisabled();

  await page.getByRole("button", { name: "1 枚目の画像を取り除く" }).click();
  await expect(attachments).toHaveCount(3);
  await expect(page.getByRole("button", { name: "画像を追加" })).toBeEnabled();
});

test("画像付きの投稿を削除すると、画像も配信されなくなる", async ({
  page,
  request,
  createUser,
  signInAs,
}) => {
  await signInAs(await createUser());
  await page.goto("/");
  await chooseFiles(page.getByRole("button", { name: "画像を追加" }), [await jpegFile("photo.jpg")]);
  await expect(page.getByRole("list", { name: "添付する画像" })).toBeVisible();
  await page.getByLabel("投稿の本文").fill("すぐ消す写真");
  await page.getByRole("button", { name: "投稿", exact: true }).click();

  const image = page.getByRole("article").getByRole("img", { name: "画像" });
  await expect(image).toBeVisible();
  const src = await image.getAttribute("src");
  expect(src).toMatch(/^\/local-media\//);
  expect((await request.get(src!)).status()).toBe(200);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "投稿を削除" }).click();
  await expect(page.getByText("すぐ消す写真")).toHaveCount(0);
  await expect.poll(async () => (await request.get(src!)).status()).toBe(404);
});

test("設定画面でアイコンを変えると、ヘッダーのアイコンも変わる", async ({
  page,
  createUser,
  signInAs,
}) => {
  await signInAs(await createUser({ name: "アリス" }));
  await page.goto("/settings");

  const section = page.getByRole("region", { name: "アイコン" });
  await chooseFiles(section.getByRole("button", { name: "画像を選ぶ" }), [
    await jpegFile("me.jpg", 900, 600),
  ]);
  await expect(section.getByRole("img", { name: "新しいアイコンのプレビュー" })).toBeVisible();
  await section.getByRole("button", { name: "アイコンを保存" }).click();

  await expect(section.getByRole("status")).toHaveText("アイコンを変更しました");
  await expect(page.locator("header img")).toHaveAttribute("src", /^\/local-media\/local\/avatar\//);
});

test("投稿のリンクのプレビュー（OGP）に、投稿者と本文が入る", async ({
  request,
  createUser,
  createPost,
}) => {
  const alice = await createUser({ name: "アリス", handle: "alice" });
  const postId = await createPost(alice.id, "リンクのプレビューの\nテストです");

  // LINE や Facebook などのプレビュー用のロボットを名乗ってページを取得する
  const response = await request.get(`/posts/${postId}`, {
    headers: { "User-Agent": "facebookexternalhit/1.1;line-poker/1.0" },
  });
  const html = await response.text();
  const head = html.slice(0, html.indexOf("</head>"));

  expect(head).toContain('<meta property="og:title" content="アリスさん（@alice）の投稿"/>');
  expect(head).toContain(
    '<meta property="og:description" content="リンクのプレビューの テストです"/>',
  );
  expect(head).toContain('<meta property="og:image" content="http://localhost:3100/og-image.png"/>');
  expect(head).toContain('<meta name="twitter:card" content="summary_large_image"/>');
});
