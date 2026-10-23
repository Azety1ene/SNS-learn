import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { media, postMedia, posts, users } from "@/db/schema";
import { createUser } from "../../../tests/support/factories";
import {
  countStoredFiles,
  createTestImageFile,
  storageDir,
  storedFilePath,
} from "../../../tests/support/images";
import {
  deleteUnusedMedia,
  discardMedia,
  GLOBAL_STORAGE_BYTES,
  GLOBAL_UPLOADS_PER_31_DAYS,
  reserveMedia,
  uploadImages,
  USER_UPLOADS_PER_DAY,
} from "./mutations";

/** 予約に渡す画像 1 枚分の情報 */
function imageToReserve(sizeBytes = 1000) {
  return { pathname: `local/post/${randomUUID()}.webp`, sizeBytes, width: 10, height: 10 };
}

/** media に行を直接追加する（上限の手前の状態などを作るため） */
async function insertMedia(values: Partial<typeof media.$inferInsert> & { ownerId: string }) {
  const [row] = await db
    .insert(media)
    .values({ purpose: "post", ...imageToReserve(), ...values })
    .returning();
  return row;
}

async function fileExists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function getMediaRow(id: number) {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row;
}

describe("reserveMedia（アップロードの枠の予約）", () => {
  it("上限の範囲なら「アップロード中」（url が空）の行を追加し、渡した順番で ID を返す", async () => {
    const alice = await createUser();
    const images = [imageToReserve(), imageToReserve(), imageToReserve()];

    const ids = await reserveMedia(alice.id, "post", images);

    const rows = await db.select().from(media).where(eq(media.ownerId, alice.id));
    expect(rows).toHaveLength(3);
    for (const [index, id] of ids.entries()) {
      const row = rows.find((r) => r.id === id);
      expect(row?.pathname).toBe(images[index].pathname);
      expect(row?.url).toBeNull();
      expect(row?.deletedAt).toBeNull();
    }
  });

  it(`1 人 24 時間で ${USER_UPLOADS_PER_DAY} 枚まで。超える分は予約できず、残りの枚数を伝える`, async () => {
    const alice = await createUser();
    const bob = await createUser();
    await reserveMedia(alice.id, "post", Array.from({ length: 8 }, () => imageToReserve()));

    await expect(
      reserveMedia(alice.id, "post", [imageToReserve(), imageToReserve(), imageToReserve()]),
    ).rejects.toThrow(`24 時間で ${USER_UPLOADS_PER_DAY} 枚までです（あと 2 枚）`);
    // 断られたときは 1 枚も追加されない
    expect(await db.$count(media, eq(media.ownerId, alice.id))).toBe(8);

    // 残りの 2 枚は予約でき、他の人は影響を受けない
    await reserveMedia(alice.id, "post", [imageToReserve(), imageToReserve()]);
    await reserveMedia(bob.id, "post", [imageToReserve()]);
  });

  it("削除した画像も、24 時間の枚数に数える（消せば何度でもアップロードできる、とならないように）", async () => {
    const alice = await createUser();
    for (let i = 0; i < USER_UPLOADS_PER_DAY; i++) {
      await insertMedia({ ownerId: alice.id, deletedAt: new Date() });
    }
    await expect(reserveMedia(alice.id, "post", [imageToReserve()])).rejects.toThrow(
      "（あと 0 枚）",
    );
  });

  it("24 時間より前のアップロードは数えない", async () => {
    const alice = await createUser();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    for (let i = 0; i < USER_UPLOADS_PER_DAY; i++) {
      await insertMedia({ ownerId: alice.id, createdAt: yesterday });
    }
    await expect(reserveMedia(alice.id, "post", [imageToReserve()])).resolves.toHaveLength(1);
  });

  it(`サービス全体で直近 31 日に ${GLOBAL_UPLOADS_PER_31_DAYS} 枚アップロードされたら、誰も予約できない`, async () => {
    const alice = await createUser();
    const bob = await createUser();
    // ボブが 2 日前に上限ちょうどの枚数をアップロードした状態を作る
    await db.execute(sql`
      insert into ${media} (owner_id, purpose, pathname, size_bytes, width, height, created_at)
      select ${bob.id}, 'post', 'local/post/bulk-' || g, 1000, 10, 10, now() - interval '2 days'
      from generate_series(1, ${GLOBAL_UPLOADS_PER_31_DAYS}) as g
    `);

    await expect(reserveMedia(alice.id, "post", [imageToReserve()])).rejects.toThrow(
      "今月のアップロード数が上限に達した",
    );

    // 32 日より前のことにすると、数えられなくなる
    await db.update(media).set({ createdAt: sql`now() - interval '32 days'` });
    await expect(reserveMedia(alice.id, "post", [imageToReserve()])).resolves.toHaveLength(1);
  });

  it("保存容量の合計が上限を超える予約はできない（削除済みの画像は容量に数えない）", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const big = await insertMedia({
      ownerId: bob.id,
      url: "/local-media/big",
      sizeBytes: GLOBAL_STORAGE_BYTES - 1000,
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    });

    await expect(reserveMedia(alice.id, "post", [imageToReserve(2000)])).rejects.toThrow(
      "保存容量が上限に達した",
    );
    await expect(reserveMedia(alice.id, "post", [imageToReserve(1000)])).resolves.toHaveLength(1);

    await db.update(media).set({ deletedAt: new Date() }).where(eq(media.id, big.id));
    await expect(reserveMedia(alice.id, "post", [imageToReserve(2000)])).resolves.toHaveLength(1);
  });

  it("同時に 15 件の予約が届いても、通るのは上限の 10 件だけ（ロックで 1 件ずつ処理する）", async () => {
    const alice = await createUser();

    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () => reserveMedia(alice.id, "post", [imageToReserve()])),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      USER_UPLOADS_PER_DAY,
    );
    expect(await db.$count(media, eq(media.ownerId, alice.id))).toBe(USER_UPLOADS_PER_DAY);
  });
});

describe("uploadImages（変換 → 予約 → 保存）", () => {
  it("変換した画像を保存し、行は「アップロード中」のまま返す", async () => {
    const alice = await createUser();
    const files = [await createTestImageFile(), await createTestImageFile({ width: 100 })];

    const uploaded = await uploadImages(alice.id, "post", files);

    expect(uploaded).toHaveLength(2);
    for (const image of uploaded) {
      expect(image.url).toMatch(/^\/local-media\/local\/post\/[0-9a-f-]{36}\.webp$/);
      expect(await fileExists(storedFilePath(image.url))).toBe(true);
      const row = await getMediaRow(image.id);
      // url は、投稿と同じトランザクションで記録するまで空のまま
      expect(row.url).toBeNull();
      expect(row.sizeBytes).toBeGreaterThan(0);
    }
    expect([uploaded[1].width, uploaded[1].height]).toEqual([100, 200]);
  });

  it("上限を超えるときは、ファイルを 1 つも保存しない", async () => {
    const alice = await createUser();
    for (let i = 0; i < USER_UPLOADS_PER_DAY; i++) await insertMedia({ ownerId: alice.id });

    await expect(uploadImages(alice.id, "post", [await createTestImageFile()])).rejects.toThrow(
      "24 時間で",
    );
    expect(await countStoredFiles()).toBe(0);
  });

  it("画像でないファイルが混ざっていたら、予約も保存もしない", async () => {
    const alice = await createUser();
    const notImage = new File(["hello"], "photo.jpg", { type: "image/jpeg" });

    await expect(
      uploadImages(alice.id, "post", [await createTestImageFile(), notImage]),
    ).rejects.toThrow("画像を読み込めませんでした");
    expect(await db.$count(media)).toBe(0);
    expect(await countStoredFiles()).toBe(0);
  });
});

describe("discardMedia（使わなかった画像を捨てる）", () => {
  it("ファイルを消し、行を「削除済み」にする", async () => {
    const alice = await createUser();
    const [image] = await uploadImages(alice.id, "post", [await createTestImageFile()]);

    await discardMedia([image]);

    expect(await fileExists(storedFilePath(image.url))).toBe(false);
    expect((await getMediaRow(image.id)).deletedAt).not.toBeNull();
  });
});

describe("deleteUnusedMedia（使われていない画像の片付け）", () => {
  it("どの投稿にも付いていない投稿の画像だけを消す", async () => {
    const alice = await createUser();
    const [attached, orphan] = await uploadImages(alice.id, "post", [
      await createTestImageFile(),
      await createTestImageFile(),
    ]);
    await db.update(media).set({ url: sql`'/local-media/' || ${media.pathname}` });
    const [post] = await db
      .insert(posts)
      .values({ authorId: alice.id, content: "画像つき" })
      .returning();
    await db.insert(postMedia).values({ postId: post.id, position: 0, mediaId: attached.id });

    await deleteUnusedMedia();

    expect((await getMediaRow(attached.id)).deletedAt).toBeNull();
    expect(await fileExists(storedFilePath(attached.url))).toBe(true);
    expect((await getMediaRow(orphan.id)).deletedAt).not.toBeNull();
    expect(await fileExists(storedFilePath(orphan.url))).toBe(false);
  });

  it("今のアイコンは残し、前のアイコンは消す", async () => {
    const alice = await createUser();
    const [oldIcon] = await uploadImages(alice.id, "avatar", [await createTestImageFile()]);
    const [currentIcon] = await uploadImages(alice.id, "avatar", [await createTestImageFile()]);
    await db.update(media).set({ url: sql`'/local-media/' || ${media.pathname}` });
    await db.update(users).set({ image: currentIcon.url }).where(eq(users.id, alice.id));

    await deleteUnusedMedia();

    expect((await getMediaRow(currentIcon.id)).deletedAt).toBeNull();
    expect((await getMediaRow(oldIcon.id)).deletedAt).not.toBeNull();
    expect(await fileExists(storedFilePath(oldIcon.url))).toBe(false);
  });

  it("アップロード中のまま 1 時間たった行は消すが、アップロード中の新しい行は消さない", async () => {
    const alice = await createUser();
    const [stale, fresh] = await uploadImages(alice.id, "post", [
      await createTestImageFile(),
      await createTestImageFile(),
    ]);
    await db
      .update(media)
      .set({ createdAt: sql`now() - interval '2 hours'` })
      .where(eq(media.id, stale.id));

    await deleteUnusedMedia();

    expect((await getMediaRow(stale.id)).deletedAt).not.toBeNull();
    expect(await fileExists(storedFilePath(stale.url))).toBe(false);
    expect((await getMediaRow(fresh.id)).deletedAt).toBeNull();
    expect(await fileExists(storedFilePath(fresh.url))).toBe(true);
  });

  it("ほかの環境（本番など）のファイルには手を付けない", async () => {
    // プレビュー環境の DB は本番のコピーなので、本番の画像の行も入っている。
    // プレビューで消しても、本番のファイルまで消してはいけない
    const alice = await createUser();
    const pathname = `production/post/${randomUUID()}.webp`;
    const file = path.join(storageDir(), pathname);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "production image");
    const row = await insertMedia({ ownerId: alice.id, pathname, url: `https://example.com/${pathname}` });

    await deleteUnusedMedia();

    expect((await getMediaRow(row.id)).deletedAt).not.toBeNull();
    expect(await fileExists(file)).toBe(true);
  });
});
