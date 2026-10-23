import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { follows, likes, media, postMedia, posts, users } from "@/db/schema";
import { getPgErrorCode } from "@/lib/errors";
import { createUser } from "../../tests/support/factories";

// DB の制約（最後の砦）が働くことを確かめるテスト。
// アプリ側のチェックを通らずに書き込もうとしても、DB 自体が不正なデータを拒否する。

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

/** 処理が DB のエラーで失敗したときの、エラーコードを返す */
async function pgErrorCodeOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return getPgErrorCode(error);
  }
  throw new Error("エラーになるはずの処理が成功してしまった");
}

describe("制約", () => {
  it("@ID は小文字の英数字と _ だけ（大文字や記号は DB が拒否する）", async () => {
    expect(await pgErrorCodeOf(() => createUser({ handle: "Alice" }))).toBe(CHECK_VIOLATION);
    expect(await pgErrorCodeOf(() => createUser({ handle: "a-b-c" }))).toBe(CHECK_VIOLATION);
  });

  it("同じ @ID は 2 人に付けられない（一意制約）", async () => {
    await createUser({ handle: "taro" });
    expect(await pgErrorCodeOf(() => createUser({ handle: "taro" }))).toBe(UNIQUE_VIOLATION);
  });

  it("空の投稿は保存できない", async () => {
    const alice = await createUser();
    expect(
      await pgErrorCodeOf(() => db.insert(posts).values({ authorId: alice.id, content: "" })),
    ).toBe(CHECK_VIOLATION);
  });

  it("同じ投稿に 2 回いいねすることはできない（2 列の組み合わせの主キー）", async () => {
    const alice = await createUser();
    const [post] = await db
      .insert(posts)
      .values({ authorId: alice.id, content: "投稿" })
      .returning();
    await db.insert(likes).values({ userId: alice.id, postId: post.id });
    expect(
      await pgErrorCodeOf(() => db.insert(likes).values({ userId: alice.id, postId: post.id })),
    ).toBe(UNIQUE_VIOLATION);
  });

  it("自分自身はフォローできない", async () => {
    const alice = await createUser();
    expect(
      await pgErrorCodeOf(() =>
        db.insert(follows).values({ followerId: alice.id, followingId: alice.id }),
      ),
    ).toBe(CHECK_VIOLATION);
  });
});

describe("画像の制約", () => {
  /** 画像の行を 1 つ作る */
  async function insertMedia(ownerId: string, n: number) {
    const [row] = await db
      .insert(media)
      .values({
        ownerId,
        purpose: "post",
        pathname: `local/post/${n}.webp`,
        url: `/local-media/local/post/${n}.webp`,
        sizeBytes: 1000,
        width: 10,
        height: 10,
      })
      .returning();
    return row;
  }

  it("1 つの投稿に付けられる画像は 4 枚まで（何枚目かは 0〜3 だけ、同じ番号は 2 回使えない）", async () => {
    const alice = await createUser();
    const [post] = await db.insert(posts).values({ authorId: alice.id, content: "投稿" }).returning();
    for (let position = 0; position < 4; position++) {
      const image = await insertMedia(alice.id, position);
      await db.insert(postMedia).values({ postId: post.id, position, mediaId: image.id });
    }

    const fifth = await insertMedia(alice.id, 4);
    expect(
      await pgErrorCodeOf(() =>
        db.insert(postMedia).values({ postId: post.id, position: 4, mediaId: fifth.id }),
      ),
    ).toBe(CHECK_VIOLATION);
    expect(
      await pgErrorCodeOf(() =>
        db.insert(postMedia).values({ postId: post.id, position: 0, mediaId: fifth.id }),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });

  it("1 枚の画像を 2 つの投稿で使い回すことはできない", async () => {
    const alice = await createUser();
    const [first, second] = await db
      .insert(posts)
      .values([
        { authorId: alice.id, content: "1 つ目" },
        { authorId: alice.id, content: "2 つ目" },
      ])
      .returning();
    const image = await insertMedia(alice.id, 1);
    await db.insert(postMedia).values({ postId: first.id, position: 0, mediaId: image.id });
    expect(
      await pgErrorCodeOf(() =>
        db.insert(postMedia).values({ postId: second.id, position: 0, mediaId: image.id }),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });

  it("用途は post か avatar だけ", async () => {
    const alice = await createUser();
    expect(
      await pgErrorCodeOf(() =>
        db.execute(
          sql`insert into media (owner_id, purpose, pathname, size_bytes, width, height)
              values (${alice.id}, 'video', 'local/video/1.mp4', 1000, 10, 10)`,
        ),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it("投稿を消すと画像の紐付けは消えるが、画像の行は残る（ファイルの片付けはアプリが行う）", async () => {
    const alice = await createUser();
    const [post] = await db.insert(posts).values({ authorId: alice.id, content: "投稿" }).returning();
    const image = await insertMedia(alice.id, 1);
    await db.insert(postMedia).values({ postId: post.id, position: 0, mediaId: image.id });

    await db.delete(posts).where(eq(posts.id, post.id));

    expect(await db.select().from(postMedia)).toEqual([]);
    expect(await db.select().from(media)).toHaveLength(1);
  });
});

describe("外部キーと ON DELETE CASCADE", () => {
  it("ユーザーを削除すると、その人の投稿・いいね・フォローもまとめて消える", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const [post] = await db
      .insert(posts)
      .values({ authorId: alice.id, content: "アリスの投稿" })
      .returning();
    await db.insert(likes).values({ userId: bob.id, postId: post.id });
    await db.insert(follows).values({ followerId: alice.id, followingId: bob.id });

    await db.delete(users).where(eq(users.id, alice.id));

    expect(await db.select().from(posts)).toEqual([]);
    // アリスの投稿に付いていたボブのいいねも、投稿といっしょに消える
    expect(await db.select().from(likes)).toEqual([]);
    expect(await db.select().from(follows)).toEqual([]);
    // ボブ自身は残る
    expect(await db.select().from(users).where(eq(users.id, bob.id))).toHaveLength(1);
  });
});

describe("更新日時", () => {
  it("UPDATE すると updated_at が自動で新しくなる", async () => {
    const alice = await createUser();
    await new Promise((resolve) => setTimeout(resolve, 10));

    await db.update(users).set({ name: "新しい名前" }).where(eq(users.id, alice.id));

    const [updated] = await db.select().from(users).where(eq(users.id, alice.id));
    expect(updated.updatedAt.getTime()).toBeGreaterThan(alice.updatedAt.getTime());
  });
});
