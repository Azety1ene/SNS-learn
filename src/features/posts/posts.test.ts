import { describe, expect, it } from "vitest";
import { createUser } from "../../../tests/support/factories";
import { setFollow } from "../users/mutations";
import { createPost, deletePost, setLike } from "./mutations";
import { getPost, getReplies, getTimeline, TIMELINE_PAGE_SIZE } from "./queries";

// 本物の PostgreSQL（テスト用 DB）に対して実行するテスト

describe("createPost", () => {
  it("投稿を保存し、本文は前後の空白を取り除いて保存する", async () => {
    const alice = await createUser();
    const { id } = await createPost(alice.id, { content: "  はじめての投稿  " });

    const post = await getPost(id, alice.id);
    expect(post?.content).toBe("はじめての投稿");
    expect(post?.author.handle).toBe(alice.handle);
  });

  it("空の本文は保存しない", async () => {
    const alice = await createUser();
    await expect(createPost(alice.id, { content: "   " })).rejects.toThrow(
      "本文を入力してください",
    );
  });

  it("存在しない投稿には返信できない", async () => {
    const alice = await createUser();
    await expect(createPost(alice.id, { content: "返信", parentId: 999 })).rejects.toThrow(
      "返信先の投稿が見つかりません",
    );
  });
});

describe("deletePost", () => {
  it("自分の投稿は削除でき、返信もいっしょに消える", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { id } = await createPost(alice.id, { content: "元の投稿" });
    const reply = await createPost(bob.id, { content: "返信", parentId: id });

    expect(await deletePost(alice.id, id)).toBe(true);
    expect(await getPost(id, alice.id)).toBeNull();
    expect(await getPost(reply.id, bob.id)).toBeNull();
  });

  it("他人の投稿は削除できない", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { id } = await createPost(alice.id, { content: "アリスの投稿" });

    expect(await deletePost(bob.id, id)).toBe(false);
    expect(await getPost(id, alice.id)).not.toBeNull();
  });
});

describe("setLike", () => {
  it("いいねを付けると数が増え、同じ操作を繰り返しても 1 回分しか数えない", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { id } = await createPost(alice.id, { content: "いいねしてね" });

    expect(await setLike(bob.id, id, true)).toEqual({ liked: true, likeCount: 1 });
    expect(await setLike(bob.id, id, true)).toEqual({ liked: true, likeCount: 1 });

    const post = await getPost(id, bob.id);
    expect(post?.likeCount).toBe(1);
    expect(post?.likedByMe).toBe(true);
    // いいねしていない人から見ると likedByMe は false
    expect((await getPost(id, alice.id))?.likedByMe).toBe(false);
  });

  it("いいねを外すと数が減る", async () => {
    const alice = await createUser();
    const { id } = await createPost(alice.id, { content: "投稿" });
    await setLike(alice.id, id, true);

    expect(await setLike(alice.id, id, false)).toEqual({ liked: false, likeCount: 0 });
  });

  it("存在しない投稿にはいいねできない", async () => {
    const alice = await createUser();
    await expect(setLike(alice.id, 999, true)).rejects.toThrow("投稿が見つかりません");
  });
});

describe("getTimeline", () => {
  it("ホームには自分とフォロー中の人の投稿だけが新しい順に出る", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const carol = await createUser();
    await setFollow(alice.id, bob.id, true);

    await createPost(alice.id, { content: "アリス" });
    await createPost(bob.id, { content: "ボブ" });
    await createPost(carol.id, { content: "キャロル" });

    const home = await getTimeline({ type: "home" }, alice.id);
    expect(home.posts.map((post) => post.content)).toEqual(["ボブ", "アリス"]);
  });

  it("みんなのタイムラインには全員の投稿が出るが、返信は出ない", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { id } = await createPost(alice.id, { content: "アリス" });
    await createPost(bob.id, { content: "返信", parentId: id });

    const everyone = await getTimeline({ type: "everyone" }, null);
    expect(everyone.posts.map((post) => post.content)).toEqual(["アリス"]);
    expect(everyone.posts[0].replyCount).toBe(1);
  });

  it("cursor を使うと、続きの投稿を重複なく取得できる", async () => {
    const alice = await createUser();
    const total = TIMELINE_PAGE_SIZE + 5;
    for (let i = 1; i <= total; i++) {
      await createPost(alice.id, { content: `投稿${i}` });
    }

    const first = await getTimeline({ type: "user", userId: alice.id }, null);
    expect(first.posts).toHaveLength(TIMELINE_PAGE_SIZE);
    expect(first.posts[0].content).toBe(`投稿${total}`);
    expect(first.nextCursor).not.toBeNull();

    const second = await getTimeline(
      { type: "user", userId: alice.id },
      null,
      first.nextCursor ?? undefined,
    );
    expect(second.posts.map((post) => post.content)).toEqual([
      "投稿5",
      "投稿4",
      "投稿3",
      "投稿2",
      "投稿1",
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it("ログインしていなければホームは空", async () => {
    const page = await getTimeline({ type: "home" }, null);
    expect(page).toEqual({ posts: [], nextCursor: null });
  });
});

describe("getReplies", () => {
  it("返信を古い順に返す", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const { id } = await createPost(alice.id, { content: "元の投稿" });
    await createPost(bob.id, { content: "返信1", parentId: id });
    await createPost(alice.id, { content: "返信2", parentId: id });

    const replies = await getReplies(id, null);
    expect(replies.map((post) => post.content)).toEqual(["返信1", "返信2"]);
    expect(replies[0].parentId).toBe(id);
  });
});
