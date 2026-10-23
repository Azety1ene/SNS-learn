"use client";

// 投稿 1 件を表示する部品。
// いいね・削除のボタンがあるので Client Component にしている。表示するデータはサーバーから props で受け取る。

import { MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { formatDateTime } from "@/lib/format";
import { deletePostAction } from "../actions";
import type { PostView } from "../types";
import { LikeButton } from "./like-button";
import { PostImages } from "./post-images";
import { ShareButton } from "./share-button";

type PostCardProps = {
  post: PostView;
  /** 見ている人の ID（ログインしていなければ null） */
  viewerId: string | null;
  /** 投稿の詳細ページで、その投稿自体を表示するときは true（文字を大きくする） */
  highlighted?: boolean;
  /** 削除したらホームへ移動するか（詳細ページの投稿を消したとき） */
  redirectHomeOnDelete?: boolean;
};

export function PostCard({ post, viewerId, highlighted, redirectHomeOnDelete }: PostCardProps) {
  const [deleted, setDeleted] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const profileHref = `/u/${post.author.handle}`;
  const postHref = `/posts/${post.id}`;

  function handleDelete() {
    if (!window.confirm("この投稿を削除しますか？")) return;
    startDeleting(async () => {
      const result = await deletePostAction(post.id, { redirectHome: redirectHomeOnDelete });
      if (result.ok) setDeleted(true);
      else window.alert(result.error);
    });
  }

  // 削除が成功したら、ページの再読み込みを待たずにすぐ消す
  if (deleted) return null;

  return (
    <article className={`flex gap-3 px-4 py-3 ${isDeleting ? "opacity-50" : ""}`}>
      <Link href={profileHref} className="shrink-0">
        <Avatar name={post.author.name} image={post.author.image} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1 text-sm">
          <Link href={profileHref} className="font-bold hover:underline">
            {post.author.name}
          </Link>
          <span className="text-zinc-500">@{post.author.handle}</span>
          <span className="text-zinc-400" aria-hidden>
            ·
          </span>
          <Link href={postHref} className="text-zinc-500 hover:underline">
            <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
          </Link>
        </div>

        {/* 本文は React が自動でエスケープするので、HTML として解釈されることはない（XSS 対策） */}
        <Link href={postHref} className="block">
          <p
            className={`mt-1 whitespace-pre-wrap break-words ${highlighted ? "text-lg" : "text-[15px]"}`}
          >
            {post.content}
          </p>
        </Link>
        <PostImages images={post.images} />

        <div className="-ml-2 mt-1 flex items-center gap-4">
          <Link
            href={postHref}
            aria-label={`返信 ${post.replyCount}件`}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-500 hover:text-sky-600"
          >
            <MessageCircle className="size-4" aria-hidden />
            <span>{post.replyCount}</span>
          </Link>
          {/* サーバーの最新の値が変わったときに、ボタンの状態を作り直すため key を付けている */}
          <LikeButton
            key={`${post.likedByMe}-${post.likeCount}`}
            postId={post.id}
            initialLiked={post.likedByMe}
            initialCount={post.likeCount}
            disabled={viewerId === null}
          />
          <ShareButton path={postHref} title={`${post.author.name}さんの投稿`} />
          {viewerId === post.author.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="投稿を削除"
              className="ml-auto rounded-full p-1 text-zinc-400 hover:text-red-600"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
