"use client";

// 投稿フォーム（返信フォームとしても使う）。
// 入力中の文字数をその場で表示するため Client Component にしている。
// 送信すると Server Action（createPostAction）がサーバーで実行される。

import { useActionState, useState } from "react";
import { countCharacters, normalizeText } from "@/lib/text";
import { createPostAction, type PostFormState } from "../actions";
import { POST_MAX_LENGTH } from "../validation";

type PostComposerProps = {
  /** 返信フォームとして使うときは返信先の投稿 ID */
  parentId?: number;
};

const initialState: PostFormState = { successCount: 0 };

export function PostComposer({ parentId }: PostComposerProps) {
  const [state, formAction, isPending] = useActionState(createPostAction, initialState);
  const [content, setContent] = useState("");

  // 投稿に成功した（successCount が増えた）ら入力欄を空にする
  const [handledSuccessCount, setHandledSuccessCount] = useState(0);
  if (state.successCount !== handledSuccessCount) {
    setHandledSuccessCount(state.successCount);
    setContent("");
  }

  const length = countCharacters(normalizeText(content));
  const remaining = POST_MAX_LENGTH - length;
  const canSubmit = length > 0 && remaining >= 0 && !isPending;
  const label = parentId ? "返信" : "投稿";

  return (
    <form action={formAction} className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <label htmlFor={`composer-${parentId ?? "new"}`} className="sr-only">
        {label}の本文
      </label>
      <textarea
        id={`composer-${parentId ?? "new"}`}
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={parentId ? "返信を書く" : "いまどうしてる？"}
        rows={3}
        className="w-full resize-none rounded-lg bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
      />
      <div className="flex items-center justify-end gap-3">
        <span
          aria-live="polite"
          className={`text-sm ${remaining < 0 ? "font-bold text-red-600" : "text-zinc-500"}`}
        >
          残り {remaining} 文字
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {isPending ? "送信中…" : label}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
