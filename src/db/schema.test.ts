import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { follows, likes, posts, users } from "@/db/schema";
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
