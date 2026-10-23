"use client";

import { Heart } from "lucide-react";
import { startTransition, useOptimistic, useState } from "react";
import { setLikeAction } from "../actions";

type LikeButtonProps = {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  /** ログインしていない人には押せないボタンを表示する */
  disabled: boolean;
};

/**
 * いいねボタン。押した瞬間に表示を変え（楽観的更新）、裏でサーバーに保存する。
 * サーバーから結果が返ってきたら、その値で表示を確定させる。
 */
export function LikeButton({ postId, initialLiked, initialCount, disabled }: LikeButtonProps) {
  // サーバーが確定させた状態
  const [confirmed, setConfirmed] = useState({ liked: initialLiked, count: initialCount });
  // 保存が終わるまでの間だけ表示する「たぶんこうなる」状態
  const [shown, setShown] = useOptimistic(confirmed);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const next = { liked: !shown.liked, count: shown.count + (shown.liked ? -1 : 1) };
    startTransition(async () => {
      setShown(next);
      setError(null);
      const result = await setLikeAction(postId, next.liked);
      startTransition(() => {
        if (result.ok) setConfirmed({ liked: result.liked, count: result.likeCount });
        // 失敗したら confirmed を変えないので、表示は押す前の状態に戻る
        else setError(result.error);
      });
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={shown.liked}
      aria-label={shown.liked ? "いいねを取り消す" : "いいねする"}
      title={error ?? undefined}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm disabled:cursor-not-allowed ${
        shown.liked ? "text-pink-600" : "text-zinc-500 hover:text-pink-600"
      }`}
    >
      <Heart className="size-4" fill={shown.liked ? "currentColor" : "none"} aria-hidden />
      <span>{shown.count}</span>
    </button>
  );
}
