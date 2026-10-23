"use client";

// アイコンの変更フォーム。画像を選ぶとブラウザの中で縮小し、プレビューを見てから保存できる。

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { AVATAR_RESIZE, prepareImage, type PreparedImage } from "@/features/media/resize";
import { type FormState, updateAvatarAction } from "../actions";

type AvatarFormProps = {
  name: string;
  /** 今のアイコンの URL */
  image: string | null;
};

const AVATAR_PREVIEW_SIZE = 80;

export function AvatarForm({ name, image }: AvatarFormProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateAvatarAction,
    {},
  );
  const [selected, setSelected] = useState<PreparedImage | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保存できたら、選んだ画像のプレビューを片付ける（新しいアイコンはサーバーから届く）
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.saved) setSelected(null);
  }

  async function handleFileSelected(file: File) {
    setImageError(null);
    setIsPreparing(true);
    try {
      setSelected(await prepareImage(file, AVATAR_RESIZE));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "画像を読み込めませんでした");
    } finally {
      setIsPreparing(false);
    }
  }

  function submit(formData: FormData) {
    if (!selected) return;
    formData.set("avatar", selected.file);
    formAction(formData);
  }

  const message = imageError ?? state.error;

  return (
    <form action={submit} className="space-y-3 px-4 py-6">
      <div className="flex items-center gap-4">
        {selected ? (
          <Image
            src={selected.previewUrl}
            alt="新しいアイコンのプレビュー"
            width={AVATAR_PREVIEW_SIZE}
            height={AVATAR_PREVIEW_SIZE}
            unoptimized
            // 保存するときは中央を正方形に切り抜くので、プレビューも同じように見せる
            className="size-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <Avatar name={name} image={image} size={AVATAR_PREVIEW_SIZE} />
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFileSelected(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparing || isPending}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {isPreparing ? "準備しています…" : "画像を選ぶ"}
          </button>
          {selected && (
            <>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {isPending ? "保存中…" : "アイコンを保存"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={isPending}
                className="rounded-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                やめる
              </button>
            </>
          )}
        </div>
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      {state.saved && !message && !selected && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          アイコンを変更しました
        </p>
      )}
    </form>
  );
}
