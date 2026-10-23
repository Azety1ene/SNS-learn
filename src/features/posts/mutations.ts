import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, posts } from "@/db/schema";
import {
  firstIssueMessage,
  getPgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  UserFacingError,
} from "@/lib/errors";
import { postContentSchema } from "./validation";

// このファイルの関数は「誰が」を引数で受け取る。
// ログインの確認は呼び出し元（Server Actions）の役目で、ここは DB の読み書きとルールの確認に集中する。

/** 投稿する（parentId を渡すと返信になる） */
export async function createPost(
  authorId: string,
  input: { content: unknown; parentId?: number },
): Promise<{ id: number }> {
  const parsed = postContentSchema.safeParse(input.content);
  if (!parsed.success) throw new UserFacingError(firstIssueMessage(parsed.error));

  try {
    const [created] = await db
      .insert(posts)
      .values({ authorId, content: parsed.data, parentId: input.parentId ?? null })
      .returning({ id: posts.id });
    return created;
  } catch (error) {
    // 返信先が存在しない（または同時に削除された）場合
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new UserFacingError("返信先の投稿が見つかりません");
    }
    throw error;
  }
}

/** 自分の投稿を削除する。削除できたら true（他人の投稿や存在しない投稿なら false） */
export async function deletePost(userId: string, postId: number): Promise<boolean> {
  // 「ID が一致し、かつ投稿者が自分」という条件で削除するので、他人の投稿は消せない
  const deleted = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, userId)))
    .returning({ id: posts.id });
  return deleted.length > 0;
}

/**
 * いいねを付ける／外す。
 * 「切り替え」ではなく「この状態にする」という形にしているので、同じ操作が 2 回届いても結果は変わらない。
 */
export async function setLike(
  userId: string,
  postId: number,
  liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  try {
    if (liked) {
      // すでにいいね済みなら何もしない（主キーの重複を無視する）
      await db.insert(likes).values({ userId, postId }).onConflictDoNothing();
    } else {
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    }
  } catch (error) {
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new UserFacingError("投稿が見つかりません");
    }
    throw error;
  }
  const likeCount = await db.$count(likes, eq(likes.postId, postId));
  return { liked, likeCount };
}
