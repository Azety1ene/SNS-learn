import { z } from "zod";
import { countCharacters, normalizeText } from "@/lib/text";

/** 1 つの投稿に付けられる画像の枚数 */
export const MAX_IMAGES_PER_POST = 4;

/** 画像の説明（代替テキスト）の最大文字数 */
export const ALT_TEXT_MAX_LENGTH = 1000;

/**
 * サーバーが受け取る画像 1 枚の最大サイズ（1MB）。
 * ブラウザで縮小してから送るので、普通はこれよりずっと小さい（数百 KB）。
 * 4 枚と本文を合わせても、Server Actions の上限（next.config.ts の bodySizeLimit: 4MB）に収まる大きさにしている
 */
export const MAX_UPLOAD_BYTES = 1_000_000;

/** 画像ファイル。中身が本当に画像かどうかは、サーバーで変換するとき（image.ts）に確かめる */
export const imageFileSchema = z
  .file({ error: "画像を選んでください" })
  .min(1, { error: "画像を選んでください" })
  .max(MAX_UPLOAD_BYTES, { error: "画像のファイルが大きすぎます（1MB まで）" });

/** 画像の説明（代替テキスト）。画面が見えない人の読み上げなどに使われる。空でもよい */
export const altTextSchema = z
  .string()
  .transform(normalizeText)
  .refine((text) => countCharacters(text) <= ALT_TEXT_MAX_LENGTH, {
    error: `画像の説明は${ALT_TEXT_MAX_LENGTH}文字以内で入力してください`,
  });

/** 投稿に付ける画像（0〜4 枚）と、それぞれの説明 */
export const postImagesSchema = z
  .array(z.object({ file: imageFileSchema, altText: altTextSchema }))
  .max(MAX_IMAGES_PER_POST, { error: `画像は${MAX_IMAGES_PER_POST}枚までです` });

export type PostImageInput = z.input<typeof postImagesSchema>[number];
