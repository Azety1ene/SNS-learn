import { z } from "zod";

/** 連携できる外部アカウントの種類 */
export const PROVIDERS = ["github", "google"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

/** 画面に表示する名前 */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  github: "GitHub",
  google: "Google",
};

export const providerIdSchema = z.enum(PROVIDERS, { error: "連携の種類が正しくありません" });

export const passkeyIdSchema = z
  .string({ error: "パスキーが見つかりません" })
  .min(1, { error: "パスキーが見つかりません" })
  .max(100, { error: "パスキーが見つかりません" });
