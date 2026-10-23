import { z } from "zod";
import { countCharacters, normalizeText } from "@/lib/text";

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 15;
export const NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;

/** なりすましや紛らわしさを防ぐため、使えない @ID */
const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "official",
  "staff",
  "moderator",
  "settings",
  "login",
  "logout",
  "signup",
  "onboarding",
  "explore",
  "home",
  "api",
  "me",
  "null",
  "undefined",
]);

/** @ID。大文字と小文字は区別せず、小文字にそろえて保存する */
export const handleSchema = z
  .string({ error: "IDを入力してください" })
  .trim()
  .toLowerCase()
  .min(HANDLE_MIN_LENGTH, { error: `IDは${HANDLE_MIN_LENGTH}文字以上にしてください` })
  .max(HANDLE_MAX_LENGTH, { error: `IDは${HANDLE_MAX_LENGTH}文字以内にしてください` })
  .regex(/^[a-z0-9_]+$/, { error: "IDには半角の英数字と _ だけが使えます" })
  .refine((handle) => !RESERVED_HANDLES.has(handle), {
    error: "このIDは使えません",
  });

export const displayNameSchema = z
  .string({ error: "名前を入力してください" })
  .transform(normalizeText)
  .refine((name) => name.length > 0, { error: "名前を入力してください" })
  .refine((name) => !name.includes("\n"), { error: "名前に改行は使えません" })
  .refine((name) => countCharacters(name) <= NAME_MAX_LENGTH, {
    error: `名前は${NAME_MAX_LENGTH}文字以内にしてください`,
  });

export const bioSchema = z
  .string()
  .transform(normalizeText)
  .refine((bio) => countCharacters(bio) <= BIO_MAX_LENGTH, {
    error: `自己紹介は${BIO_MAX_LENGTH}文字以内にしてください`,
  });

export const onboardingSchema = z.object({
  handle: handleSchema,
  name: displayNameSchema,
});

export const profileSchema = z.object({
  name: displayNameSchema,
  bio: bioSchema,
});
