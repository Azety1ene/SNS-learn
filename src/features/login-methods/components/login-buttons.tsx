"use client";

// ログインのボタン（GitHub・Google・パスキー）。
// - GitHub・Google: 「外部のログイン画面へ移動 → 許可 → このアプリに戻る」という流れ。
//   移動先の URL をサーバー（Better Auth）に作ってもらってから、ブラウザを移動させる
// - パスキー: ブラウザが端末（スマホなど）とやりとりして、指紋や顔で本人確認したうえで署名を作り、サーバーが確かめる
// どちらもブラウザでしかできない処理なので Client Component にしている。

import { KeyRound, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { PROVIDER_LABELS, type ProviderId } from "../validation";

type LoginButtonsProps = {
  /** Google でのログインが設定済みか */
  googleEnabled: boolean;
};

type Method = ProviderId | "passkey";

export function LoginButtons({ googleEnabled }: LoginButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingMethod, setPendingMethod] = useState<Method | null>(null);
  const [error, setError] = useState<string | null>(null);

  function signInWith(provider: ProviderId) {
    setError(null);
    setPendingMethod(provider);
    startTransition(async () => {
      const { error } = await authClient.signIn.social({
        provider,
        // ログイン後の移動先。初めての人は初回登録ページへ
        callbackURL: "/",
        newUserCallbackURL: "/onboarding",
        // 失敗したときは、ログインページに理由（?error=...）を付けて戻ってくる
        errorCallbackURL: "/login",
      });
      // 成功するとブラウザが外部のログイン画面へ移動するので、ここに来るのは失敗したときだけ
      if (error) setError("ログインを始められませんでした。時間をおいてもう一度お試しください。");
    });
  }

  function signInWithPasskey() {
    setError(null);
    setPendingMethod("passkey");
    startTransition(async () => {
      const { error } = await authClient.signIn.passkey();
      if (error) {
        setError(
          error.status === 401
            ? "このパスキーは登録されていません（削除済みかもしれません）。GitHub か Google でログインしてください。"
            : "パスキーでログインできませんでした。",
        );
        return;
      }
      // ログインできたので、このページをサーバーで描き直す。ログイン済みと分かるので、ホームへ移動する
      router.refresh();
    });
  }

  const buttonClass =
    "flex w-full items-center justify-center gap-2 rounded-full py-3 font-bold disabled:opacity-50";

  return (
    <div className="space-y-3">
      {(["github", ...(googleEnabled ? (["google"] as const) : [])] as const).map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => signInWith(provider)}
          disabled={isPending}
          className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200`}
        >
          <LogIn className="size-5" aria-hidden />
          {isPending && pendingMethod === provider
            ? `${PROVIDER_LABELS[provider]} へ移動中…`
            : `${PROVIDER_LABELS[provider]} でログイン`}
        </button>
      ))}
      <button
        type="button"
        onClick={signInWithPasskey}
        disabled={isPending}
        className={`${buttonClass} border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900`}
      >
        <KeyRound className="size-5" aria-hidden />
        {isPending && pendingMethod === "passkey" ? "確認中…" : "パスキーでログイン"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
