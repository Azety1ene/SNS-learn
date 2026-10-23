"use client";

// 投稿フォーム（返信フォームとしても使う）。
// 入力中の文字数の表示や、画像の縮小（ブラウザの中で行う）があるので Client Component にしている。
// 送信すると Server Action（createPostAction）がサーバーで実行される。

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { POST_IMAGE_RESIZE, prepareImage, type PreparedImage } from "@/features/media/resize";
import { ALT_TEXT_MAX_LENGTH, MAX_IMAGES_PER_POST } from "@/features/media/validation";
import { countCharacters, normalizeText } from "@/lib/text";
import { createPostAction, type PostFormState } from "../actions";
import { POST_MAX_LENGTH } from "../validation";

type PostComposerProps = {
  /** 返信フォームとして使うときは返信先の投稿 ID */
  parentId?: number;
};

type Attachment = PreparedImage & {
  /** 一覧の key に使う番号 */
  key: number;
  /** 画像の説明（代替テキスト） */
  altText: string;
};

const initialState: PostFormState = { successCount: 0 };

// 選べる画像の形式。iPhone の写真（HEIC）は Safari が読み込めるので、ブラウザで JPEG に変換して送る
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

export function PostComposer({ parentId }: PostComposerProps) {
  const [state, formAction, isPending] = useActionState(createPostAction, initialState);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(0);

  // 投稿に成功した（successCount が増えた）ら入力欄と画像を空にする
  const [handledSuccessCount, setHandledSuccessCount] = useState(0);
  if (state.successCount !== handledSuccessCount) {
    setHandledSuccessCount(state.successCount);
    setContent("");
    setAttachments([]);
    setImageError(null);
  }

  async function handleFilesSelected(files: File[]) {
    setImageError(null);
    const room = MAX_IMAGES_PER_POST - attachments.length;
    if (files.length > room) setImageError(`画像は${MAX_IMAGES_PER_POST}枚までです`);

    setIsPreparing(true);
    try {
      for (const file of files.slice(0, room)) {
        const prepared = await prepareImage(file, POST_IMAGE_RESIZE);
        const attachment = { ...prepared, key: nextKey.current++, altText: "" };
        setAttachments((current) => [...current, attachment]);
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "画像を読み込めませんでした");
    } finally {
      setIsPreparing(false);
    }
  }

  function updateAltText(key: number, altText: string) {
    setAttachments((current) => current.map((a) => (a.key === key ? { ...a, altText } : a)));
  }

  function removeAttachment(key: number) {
    setAttachments((current) => current.filter((a) => a.key !== key));
  }

  // フォームの内容に、縮小した画像とその説明を足してから Server Action に渡す
  function submit(formData: FormData) {
    for (const attachment of attachments) {
      formData.append("images", attachment.file);
      formData.append("altTexts", attachment.altText);
    }
    formAction(formData);
  }

  const length = countCharacters(normalizeText(content));
  const remaining = POST_MAX_LENGTH - length;
  const canSubmit = length > 0 && remaining >= 0 && !isPending && !isPreparing;
  const label = parentId ? "返信" : "投稿";
  const id = `composer-${parentId ?? "new"}`;

  return (
    <form action={submit} className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <label htmlFor={id} className="sr-only">
        {label}の本文
      </label>
      <textarea
        id={id}
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={parentId ? "返信を書く" : "いまどうしてる？"}
        rows={3}
        className="w-full resize-none rounded-lg bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
      />

      {attachments.length > 0 && (
        <ul aria-label="添付する画像" className="mb-2 space-y-2">
          {attachments.map((attachment, index) => (
            <li key={attachment.key} className="flex items-center gap-2">
              <Image
                src={attachment.previewUrl}
                alt={`${index + 1} 枚目の画像`}
                width={56}
                height={56}
                unoptimized
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <input
                type="text"
                value={attachment.altText}
                onChange={(event) => updateAltText(attachment.key, event.target.value)}
                maxLength={ALT_TEXT_MAX_LENGTH * 2}
                placeholder="画像の説明（任意）"
                aria-label={`${index + 1} 枚目の画像の説明`}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-zinc-700"
              />
              <button
                type="button"
                onClick={() => removeAttachment(attachment.key)}
                aria-label={`${index + 1} 枚目の画像を取り除く`}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            // 同じ画像をもう一度選んだときも onChange が呼ばれるように、選んだ内容を空に戻す
            event.target.value = "";
            void handleFilesSelected(files);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= MAX_IMAGES_PER_POST || isPreparing || isPending}
          aria-label="画像を追加"
          className="-ml-2 rounded-full p-2 text-sky-600 hover:bg-sky-50 disabled:opacity-40 dark:hover:bg-sky-950"
        >
          <ImagePlus className="size-5" aria-hidden />
        </button>
        {isPreparing && <span className="text-sm text-zinc-500">画像を準備しています…</span>}
        <span
          aria-live="polite"
          className={`ml-auto text-sm ${remaining < 0 ? "font-bold text-red-600" : "text-zinc-500"}`}
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
      {(imageError ?? state.error) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {imageError ?? state.error}
        </p>
      )}
    </form>
  );
}
