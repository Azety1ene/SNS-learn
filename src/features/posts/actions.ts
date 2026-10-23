"use server";

// Server Actions: ブラウザ（Client Components）から呼び出せる、サーバー側の関数。
// 中身は「本人確認 → 入力チェック → mutations.ts の関数を呼ぶ → 画面を更新」だけの薄い層にしている。

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { UserFacingError } from "@/lib/errors";
import { getRegisteredViewer, getViewer } from "@/lib/session";
import { createPost, deletePost, setLike } from "./mutations";
import { getTimeline } from "./queries";
import type { TimelinePage } from "./types";
import { postIdSchema, timelineSourceSchema } from "./validation";

const NOT_SIGNED_IN = "ログインしてください";

export type PostFormState = {
  error?: string;
  /** 投稿できた回数。増えたらフォームを空にする合図として使う */
  successCount: number;
};

/** 投稿フォーム（返信フォーム）から呼ばれる */
export async function createPostAction(
  prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ...prevState, error: NOT_SIGNED_IN };

  const rawParentId = formData.get("parentId");
  const parentId = rawParentId ? postIdSchema.safeParse(rawParentId) : null;
  if (parentId && !parentId.success) {
    return { ...prevState, error: "返信先の投稿が見つかりません" };
  }

  try {
    await createPost(viewer.id, {
      content: formData.get("content"),
      parentId: parentId?.data,
    });
  } catch (error) {
    if (error instanceof UserFacingError) return { ...prevState, error: error.message };
    throw error;
  }

  // 今いるページをサーバーで描き直して、新しい投稿を表示する
  refresh();
  return { successCount: prevState.successCount + 1 };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deletePostAction(
  postId: number,
  options: { redirectHome?: boolean } = {},
): Promise<ActionResult> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ok: false, error: NOT_SIGNED_IN };

  const id = postIdSchema.safeParse(postId);
  if (!id.success) return { ok: false, error: "投稿が見つかりません" };

  const deleted = await deletePost(viewer.id, id.data);
  if (!deleted) return { ok: false, error: "削除できる投稿が見つかりません" };

  // 投稿の詳細ページでその投稿を消したときは、もう表示できないのでホームへ移動する
  if (options.redirectHome === true) redirect("/");
  refresh();
  return { ok: true };
}

export type LikeResult =
  | { ok: true; liked: boolean; likeCount: number }
  | { ok: false; error: string };

export async function setLikeAction(postId: number, liked: boolean): Promise<LikeResult> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ok: false, error: NOT_SIGNED_IN };

  const input = z.object({ postId: postIdSchema, liked: z.boolean() }).safeParse({ postId, liked });
  if (!input.success) return { ok: false, error: "投稿が見つかりません" };

  try {
    const result = await setLike(viewer.id, input.data.postId, input.data.liked);
    // いいねボタンは自分で表示を更新するので、ページ全体の描き直し（refresh）はしない
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    throw error;
  }
}

/** タイムラインの続き（もっと古い投稿）を読み込む。下までスクロールしたときに呼ばれる */
export async function loadMorePostsAction(
  source: unknown,
  cursor: number,
): Promise<TimelinePage> {
  const parsedSource = timelineSourceSchema.safeParse(source);
  const parsedCursor = postIdSchema.safeParse(cursor);
  if (!parsedSource.success || !parsedCursor.success) {
    return { posts: [], nextCursor: null };
  }
  // 「誰のホームか」はブラウザから受け取らず、必ずサーバー側のログイン情報から決める
  const viewer = await getViewer();
  return getTimeline(parsedSource.data, viewer?.id ?? null, parsedCursor.data);
}
