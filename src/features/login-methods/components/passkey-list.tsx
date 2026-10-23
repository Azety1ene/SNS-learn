"use client";

// パスキーの一覧と、追加・削除のボタン。
// 追加はブラウザが端末とやりとりして鍵のペアを作る必要があるので、ブラウザから Better Auth を呼ぶ。
// 削除はこのアプリの Server Action。

import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";
import { deletePasskeyAction } from "../actions";

type PasskeyListProps = {
  passkeys: { id: string; name: string | null; createdAt: string }[];
};

/** パスキーに付ける名前。どの端末で作ったかが分かるようにする */
function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "パスキー";
}

export function PasskeyList({ passkeys }: PasskeyListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addPasskey() {
    setError(null);
    startTransition(async () => {
      const { error } = await authClient.passkey.addPasskey({ name: deviceName() });
      if (error) {
        setError(
          "code" in error && error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
            ? "この端末のパスキーは、すでに登録されています。"
            : "パスキーを追加できませんでした。",
        );
        return;
      }
      // 追加したパスキーを一覧に出すため、サーバーで描き直す
      router.refresh();
    });
  }

  function deletePasskey(id: string) {
    if (
      !window.confirm(
        "このパスキーを削除しますか？\n端末に保存されたパスキーは、端末の設定から別に削除してください。",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deletePasskeyAction(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {passkeys.length > 0 && (
        <ul
          aria-label="登録したパスキー"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 px-3 py-2">
              <KeyRound className="size-4 shrink-0 text-zinc-500" aria-hidden />
              <span className="min-w-0">
                <span className="block font-bold">{passkey.name ?? "パスキー"}</span>
                <span className="block text-xs text-zinc-500">
                  {formatDate(passkey.createdAt)} に追加
                </span>
              </span>
              <button
                type="button"
                onClick={() => deletePasskey(passkey.id)}
                disabled={isPending}
                aria-label={`パスキー「${passkey.name ?? "パスキー"}」を削除`}
                className="ml-auto rounded-full p-2 text-zinc-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addPasskey}
        disabled={isPending}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {isPending ? "確認中…" : "パスキーを追加"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
