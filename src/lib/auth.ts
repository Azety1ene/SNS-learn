import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { oAuthProxy } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

// VERCEL_* は Vercel が自動で設定してくれる環境変数。
// 本番の URL は、プレビュー環境からも参照できる。
const productionURL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

// プレビュー環境の URL（コミットごとの URL と、ブランチごとの URL）
const previewHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(
  (host): host is string => Boolean(host),
);

/** このアプリ自身の URL。ログイン後の戻り先などを組み立てるのに使う */
function resolveBaseURL() {
  // ローカル開発とテストでは環境変数で指定する（例: http://localhost:3000）
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") return productionURL;
  if (process.env.VERCEL_ENV === "preview" && previewHosts.length > 0) {
    // プレビューは URL が 2 種類あるので、アクセスされた方を使う
    return {
      allowedHosts: previewHosts,
      fallback: `https://${previewHosts[0]}`,
      protocol: "https" as const,
    };
  }
  return undefined;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  // Vercel 上で設定し忘れたときは、ビルドの時点で分かるようにエラーにする
  if (!value && process.env.VERCEL_ENV) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value ?? "";
}

export const auth = betterAuth({
  appName: "SNS-learn",
  baseURL: resolveBaseURL(),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  trustedOrigins: [
    ...(productionURL ? [productionURL] : []),
    ...previewHosts.map((host) => `https://${host}`),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  socialProviders: {
    github: {
      clientId: requiredEnv("GITHUB_CLIENT_ID"),
      clientSecret: requiredEnv("GITHUB_CLIENT_SECRET"),
    },
  },
  user: {
    // SNS 用に users テーブルへ追加した項目。
    // input: false にして、Better Auth の API からは書き換えられないようにする（変更は自前の処理で検証してから行う）
    additionalFields: {
      handle: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false, defaultValue: "" },
    },
  },
  account: {
    // GitHub から受け取ったトークンを暗号化して保存する（DB が漏れても悪用されにくい）
    encryptOAuthTokens: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // ログイン状態は 30 日間有効
    updateAge: 60 * 60 * 24, // 1 日ごとに有効期限を延長する
  },
  rateLimit: {
    // ログイン処理への連続アクセスを制限する。サーバーが複数台になっても共有できるよう DB に記録する
    storage: "database",
  },
  // このアプリで使わない機能は無効にして、攻撃の入口を減らす
  disabledPaths: [
    "/update-user",
    "/change-email",
    "/change-password",
    "/set-password",
    "/link-social",
    "/unlink-account",
    "/get-access-token",
    "/refresh-token",
    "/account-info",
  ],
  plugins: [
    // プレビュー環境では、本番の URL を経由して GitHub ログインする（GitHub に登録できる戻り先 URL は 1 つだけのため）
    oAuthProxy({ productionURL }),
    // Server Actions の中で Cookie を正しく設定するためのプラグイン（必ず最後に置く）
    nextCookies(),
  ],
});
