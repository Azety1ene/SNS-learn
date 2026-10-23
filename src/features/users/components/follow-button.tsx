"use client";

import { startTransition, useOptimistic, useState } from "react";
import { setFollowAction } from "../actions";

type FollowButtonProps = {
  targetUserId: string;
  isFollowing: boolean;
};

/** フォローボタン。押した瞬間に表示を切り替え、保存後にページを描き直してフォロワー数も更新する */
export function FollowButton({ targetUserId, isFollowing }: FollowButtonProps) {
  const [shown, setShown] = useOptimistic(isFollowing);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const next = !shown;
    startTransition(async () => {
      setShown(next);
      setError(null);
      const result = await setFollowAction(targetUserId, next);
      // 成功時はサーバー側で refresh() され、新しい isFollowing が props で届く
      if (!result.ok) startTransition(() => setError(result.error));
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={shown}
        className={`rounded-full px-4 py-1.5 text-sm font-bold ${
          shown
            ? "border border-zinc-300 text-zinc-900 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-100"
            : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        }`}
      >
        {shown ? "フォロー中" : "フォローする"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
