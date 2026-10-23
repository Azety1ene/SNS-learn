import type { Metadata } from "next";

export const SITE_NAME = "SNS-learn";
export const SITE_DESCRIPTION = "学習のために作っている、テキスト中心の SNS です。";

/**
 * このサイトの URL。リンクのプレビュー（OGP）の画像の URL など、
 * ほかのサービスに渡すために「https:// から始まる完全な URL」が必要なときに使う。
 * VERCEL_* は Vercel が自動で設定する環境変数
 */
export function getSiteUrl(): URL {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  return new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
}

/**
 * リンクのプレビューの共通の設定。
 * ページで openGraph を設定すると、親（layout）の openGraph は丸ごと置き換わるので、各ページでこれを広げて使う
 */
export const baseOpenGraph = {
  siteName: SITE_NAME,
  locale: "ja_JP",
  images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
} satisfies Metadata["openGraph"];
