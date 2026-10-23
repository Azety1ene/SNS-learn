"use client";

// GitHub でのログインを始めるボタン。
// ログインは「GitHub のページへ移動 → 許可 → このアプリに戻る」という流れで、
// 移動先の URL をサーバー（Better Auth）に作ってもらってからブラウザを移動させる必要があるため Client Component にしている。

import { LogIn } from "lucide-react";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.signIn.social({
        provider: "github",
        // ログイン後の移動先。初めての人は初回登録ページへ
        callbackURL: "/",
        newUserCallbackURL: "/onboarding",
        errorCallbackURL: "/login?error=1",
      });
      // 成功するとブラウザが GitHub へ移動するので、ここに来るのは失敗したときだけ
      if (error) setError("ログインを始められませんでした。時間をおいてもう一度お試しください。");
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 font-bold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        <LogIn className="size-5" aria-hidden />
        {isPending ? "GitHub へ移動中…" : "GitHub でログイン"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
