"use client";

// 連携している外部アカウント（GitHub・Google）の一覧と、連携・解除のボタン。
// 連携は外部のログイン画面へ移動する必要があるので、ブラウザから Better Auth を呼ぶ。
// 解除はこのアプリの Server Action（最後の 1 つは解除できないことを、サーバーで確かめる）。

import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { unlinkAccountAction } from "../actions";
import { PROVIDER_LABELS, PROVIDERS, type ProviderId } from "../validation";

type LinkedAccountsProps = {
  /** 連携済みのアカウントの種類 */
  linked: string[];
  /** Google でのログインが設定済みか */
  googleEnabled: boolean;
};

export function LinkedAccounts({ linked, googleEnabled }: LinkedAccountsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const providers = PROVIDERS.filter(
    (provider) => provider !== "google" || googleEnabled || linked.includes(provider),
  );

  function link(provider: ProviderId) {
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.linkSocial({
        provider,
        // 連携が終わったら（失敗しても）設定画面に戻ってくる。失敗したときは ?error=理由 が付く
        callbackURL: "/settings",
        errorCallbackURL: "/settings",
      });
      if (error) setError("連携を始められませんでした。時間をおいてもう一度お試しください。");
    });
  }

  function unlink(provider: ProviderId) {
    if (!window.confirm(`${PROVIDER_LABELS[provider]} との連携を解除しますか？`)) return;
    setError(null);
    startTransition(async () => {
      const result = await unlinkAccountAction(provider);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {providers.map((provider) => {
          const isLinked = linked.includes(provider);
          return (
            <li key={provider} className="flex items-center gap-3 px-3 py-2">
              <span className="font-bold">{PROVIDER_LABELS[provider]}</span>
              <span className="text-sm text-zinc-500">{isLinked ? "連携済み" : "未連携"}</span>
              {isLinked ? (
                // 最後の 1 つは解除できない（ログインできなくなるため）
                linked.length > 1 && (
                  <button
                    type="button"
                    onClick={() => unlink(provider)}
                    disabled={isPending}
                    aria-label={`${PROVIDER_LABELS[provider]} との連携を解除`}
                    className="ml-auto rounded-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                  >
                    解除
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => link(provider)}
                  disabled={isPending}
                  aria-label={`${PROVIDER_LABELS[provider]} と連携する`}
                  className="ml-auto rounded-full border border-zinc-300 px-3 py-1 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  連携する
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
