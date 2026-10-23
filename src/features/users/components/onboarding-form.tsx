"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type FormState } from "../actions";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, NAME_MAX_LENGTH } from "../validation";

/** 初回登録フォーム（@ID と表示名を決める） */
export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    completeOnboardingAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5 px-4 py-6">
      <div>
        <label htmlFor="handle" className="block text-sm font-bold">
          ユーザーID
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          半角の英数字と _ で{HANDLE_MIN_LENGTH}〜{HANDLE_MAX_LENGTH}文字。あとから変更はできません。
        </p>
        <div className="mt-2 flex items-center rounded-lg border border-zinc-300 px-3 focus-within:border-sky-500 dark:border-zinc-700">
          <span className="text-zinc-500">@</span>
          <input
            id="handle"
            name="handle"
            required
            minLength={HANDLE_MIN_LENGTH}
            maxLength={HANDLE_MAX_LENGTH}
            pattern="[A-Za-z0-9_]+"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent py-2 pl-1 outline-none"
          />
        </div>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-bold">
          表示名
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={NAME_MAX_LENGTH}
          defaultValue={defaultName}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-sky-500 dark:border-zinc-700"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-sky-600 py-2.5 font-bold text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {isPending ? "登録中…" : "はじめる"}
      </button>
    </form>
  );
}
