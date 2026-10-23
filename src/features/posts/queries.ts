import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, likes, posts, users } from "@/db/schema";
import type { PostView, TimelinePage } from "./types";
import type { TimelineSource } from "./validation";

export const TIMELINE_PAGE_SIZE = 20;
const REPLIES_LIMIT = 100;

/** 投稿を取得するときの共通の SELECT（投稿者・いいね数・返信数・自分がいいね済みか） */
function selectPosts(viewerId: string | null) {
  return db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      parentId: posts.parentId,
      authorId: users.id,
      authorHandle: users.handle,
      authorName: users.name,
      authorImage: users.image,
      likeCount: db.$count(likes, eq(likes.postId, posts.id)),
      // 返信の数: 同じ posts テーブルの中から「parent_id がこの投稿の ID」の行を数える。
      // 外側の posts と区別するため、内側には replies という別名を付けている
      replyCount: sql<number>`(select count(*) from ${posts} as replies where replies.parent_id = ${posts.id})`.mapWith(
        Number,
      ),
      likedByMe: viewerId
        ? sql<boolean>`exists (select 1 from ${likes} where ${likes.postId} = ${posts.id} and ${likes.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId));
}

type PostRow = Awaited<ReturnType<ReturnType<typeof selectPosts>["execute"]>>[number];

function toPostView(row: PostRow): PostView {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    parentId: row.parentId,
    author: {
      id: row.authorId,
      // 投稿できるのは初回登録（@ID の決定）が済んだ人だけなので、ここで空になることはない
      handle: row.authorHandle ?? "",
      name: row.authorName,
      image: row.authorImage,
    },
    likeCount: row.likeCount,
    replyCount: row.replyCount,
    likedByMe: row.likedByMe,
  };
}

/**
 * タイムラインを新しい順に 1 ページ分取得する。
 * cursor を渡すと「その ID より古い投稿」から取得する（ページ番号ではなく ID で区切るので、
 * 読んでいる間に新しい投稿が増えても、同じ投稿が 2 回出たり抜けたりしない）。
 * OFFSET との速さの比較は docs/learning/02-database.md の 4-2 を参照。
 */
export async function getTimeline(
  source: TimelineSource,
  viewerId: string | null,
  cursor?: number,
): Promise<TimelinePage> {
  // タイムラインには返信ではない投稿だけを出す（返信は投稿の詳細ページで見る）
  const conditions: SQL[] = [isNull(posts.parentId)];
  if (cursor !== undefined) conditions.push(lt(posts.id, cursor));

  if (source.type === "home") {
    if (!viewerId) return { posts: [], nextCursor: null };
    // 自分の投稿と、フォロー中の人の投稿
    const followingIds = db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, viewerId));
    conditions.push(
      or(eq(posts.authorId, viewerId), inArray(posts.authorId, followingIds))!,
    );
  } else if (source.type === "user") {
    conditions.push(eq(posts.authorId, source.userId));
  }

  // 1 件多く取得して、続きがあるかどうかを判定する
  const rows = await selectPosts(viewerId)
    .where(and(...conditions))
    .orderBy(desc(posts.id))
    .limit(TIMELINE_PAGE_SIZE + 1);

  const page = rows.slice(0, TIMELINE_PAGE_SIZE).map(toPostView);
  const hasMore = rows.length > TIMELINE_PAGE_SIZE;
  return { posts: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

/** 投稿を 1 件取得する */
export async function getPost(
  postId: number,
  viewerId: string | null,
): Promise<PostView | null> {
  const [row] = await selectPosts(viewerId).where(eq(posts.id, postId));
  return row ? toPostView(row) : null;
}

/** 投稿への返信を古い順に取得する */
export async function getReplies(
  postId: number,
  viewerId: string | null,
): Promise<PostView[]> {
  const rows = await selectPosts(viewerId)
    .where(eq(posts.parentId, postId))
    .orderBy(asc(posts.id))
    .limit(REPLIES_LIMIT);
  return rows.map(toPostView);
}
