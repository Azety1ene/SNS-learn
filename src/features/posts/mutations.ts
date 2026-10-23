import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { likes, postMedia, posts } from "@/db/schema";
import {
  deleteUnusedMedia,
  discardMedia,
  markMediaInUse,
  uploadImages,
} from "@/features/media/mutations";
import { postImagesSchema } from "@/features/media/validation";
import {
  firstIssueMessage,
  getPgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  UserFacingError,
} from "@/lib/errors";
import { postContentSchema } from "./validation";

// このファイルの関数は「誰が」を引数で受け取る。
// ログインの確認は呼び出し元（Server Actions）の役目で、ここは DB の読み書きとルールの確認に集中する。

/**
 * 投稿する（parentId を渡すと返信になる）。
 * 画像があるときの流れ: 本文を確かめる → 画像をアップロード → 投稿と画像の紐付けを 1 つのトランザクションで保存。
 * 保存に失敗したら、アップロードした画像を捨てる
 */
export async function createPost(
  authorId: string,
  input: { content: unknown; parentId?: number; images?: unknown },
): Promise<{ id: number }> {
  // 画像をアップロードする前に、入力をすべて確かめる（無駄なアップロードで無料枠を使わないように）
  const content = postContentSchema.safeParse(input.content);
  if (!content.success) throw new UserFacingError(firstIssueMessage(content.error));
  const images = postImagesSchema.safeParse(input.images ?? []);
  if (!images.success) throw new UserFacingError(firstIssueMessage(images.error));

  const uploaded = await uploadImages(
    authorId,
    "post",
    images.data.map((image) => image.file),
  );

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(posts)
        .values({ authorId, content: content.data, parentId: input.parentId ?? null })
        .returning({ id: posts.id });
      if (uploaded.length > 0) {
        await markMediaInUse(tx, uploaded);
        await tx.insert(postMedia).values(
          uploaded.map((image, position) => ({
            postId: created.id,
            position,
            mediaId: image.id,
            altText: images.data[position].altText,
          })),
        );
      }
      return created;
    });
  } catch (error) {
    await discardMedia(uploaded);
    // 返信先が存在しない（または同時に削除された）場合
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new UserFacingError("返信先の投稿が見つかりません");
    }
    throw error;
  }
}

/** 自分の投稿を削除する。削除できたら true（他人の投稿や存在しない投稿なら false） */
export async function deletePost(userId: string, postId: number): Promise<boolean> {
  // 「ID が一致し、かつ投稿者が自分」という条件で削除するので、他人の投稿は消せない。
  // 返信と、画像の紐付け（post_media）も連鎖して消える（ON DELETE CASCADE）
  const deleted = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, userId)))
    .returning({ id: posts.id });
  if (deleted.length === 0) return false;

  // どの投稿にも付いていない画像になったので、保存先から消す
  await deleteUnusedMedia();
  return true;
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
