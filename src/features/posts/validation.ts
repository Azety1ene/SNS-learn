import { z } from "zod";
import { countCharacters, normalizeText } from "@/lib/text";

export const POST_MAX_LENGTH = 280;

/** 投稿の本文。画面（文字数の表示）とサーバー（保存前の検証）の両方で使う */
export const postContentSchema = z
  .string({ error: "本文を入力してください" })
  .transform(normalizeText)
  .refine((text) => text.length > 0, { error: "本文を入力してください" })
  .refine((text) => countCharacters(text) <= POST_MAX_LENGTH, {
    error: `${POST_MAX_LENGTH}文字以内で入力してください`,
  });

export const postIdSchema = z.coerce
  .number({ error: "投稿が見つかりません" })
  .int()
  .positive();

/** どのタイムラインの続きを読み込むか */
export const timelineSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("home") }),
  z.object({ type: z.literal("everyone") }),
  z.object({ type: z.literal("user"), userId: z.string().min(1) }),
]);

export type TimelineSource = z.infer<typeof timelineSourceSchema>;
