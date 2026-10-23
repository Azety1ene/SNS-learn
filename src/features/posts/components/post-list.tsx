"use client";

// 投稿の一覧。最初の 1 ページ分はサーバーで取得して props で受け取り、
// 下までスクロールしたら続きを Server Action で取得して後ろに足していく（無限スクロール）。
// 「スクロール位置を見張る」「取得した分を覚えておく」はブラウザでしかできないので Client Component にしている。

import { useEffect, useRef, useState } from "react";
import { loadMorePostsAction } from "../actions";
import type { PostView } from "../types";
import type { TimelineSource } from "../validation";
import { PostCard } from "./post-card";

type PostListProps = {
  initialPosts: PostView[];
  initialCursor: number | null;
  source: TimelineSource;
  viewerId: string | null;
  emptyMessage: string;
};

export function PostList({
  initialPosts,
  initialCursor,
  source,
  viewerId,
  emptyMessage,
}: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (cursor === null || isLoading) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const page = await loadMorePostsAction(source, cursor);
      // 念のため、すでに表示している投稿は足さない
      setPosts((current) => [
        ...current,
        ...page.posts.filter((post) => !current.some((shown) => shown.id === post.id)),
      ]);
      setCursor(page.nextCursor);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // 一覧の一番下にある目印が画面に入ったら、続きを読み込む
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || cursor === null || hasError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // loadMore は毎回作り直される関数なので、依存配列には入れず cursor の変化で見張り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hasError, isLoading]);

  if (posts.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} viewerId={viewerId} />
          </li>
        ))}
      </ul>
      {cursor !== null && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoading}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {isLoading ? "読み込み中…" : hasError ? "読み込めませんでした。もう一度試す" : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
