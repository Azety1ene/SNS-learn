"use client";

import { useActionState } from "react";
import { type FormState, updateProfileAction } from "../actions";
import { BIO_MAX_LENGTH, NAME_MAX_LENGTH } from "../validation";

type ProfileFormProps = {
  defaultName: string;
  defaultBio: string;
};

/** プロフィール編集フォーム（表示名と自己紹介） */
export function ProfileForm({ defaultName, defaultBio }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateProfileAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5 px-4 py-6">
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
      <div>
        <label htmlFor="bio" className="block text-sm font-bold">
          自己紹介
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={BIO_MAX_LENGTH * 2}
          defaultValue={defaultBio}
          className="mt-2 w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-sky-500 dark:border-zinc-700"
        />
        <p className="mt-1 text-xs text-zinc-500">{BIO_MAX_LENGTH}文字まで</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          保存しました
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-sky-600 px-6 py-2 font-bold text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {isPending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
