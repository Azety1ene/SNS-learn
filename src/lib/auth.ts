import "server-only";
import { passkey } from "@better-auth/passkey";
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

/**
 * パスキーを結びつける URL。パスキーは作ったときのドメインでしか使えない（だから偽サイトでは使えない）。
 * プレビューは URL が 2 種類あるが、パスキーは 1 つのドメインにしか結びつけられないので、
 * PR に表示される「ブランチごとの URL」（VERCEL_BRANCH_URL）に決めている
 */
function resolvePasskeyOrigin(): string {
  if (process.env.BETTER_AUTH_URL) return new URL(process.env.BETTER_AUTH_URL).origin;
  if (process.env.VERCEL_ENV === "production" && productionURL) return productionURL;
  const previewHost = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  if (process.env.VERCEL_ENV === "preview" && previewHost) return `https://${previewHost}`;
  return "http://localhost:3000";
}

const passkeyOrigin = resolvePasskeyOrigin();

/**
 * Google でのログインが使えるか。Google の設定（docs/deploy.md の 8 章）が済むまでは、
 * ログイン画面にボタンを出さず、Google でのログインも受け付けない
 */
export const googleLoginEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

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
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
    // 初めてログインした人の「ユーザー作成」と「GitHub アカウントとの紐付け」を 1 つのトランザクションにする。
    // 途中で失敗したときに、紐付けのないユーザーだけが残る（中途半端なデータになり、次のログインが失敗する原因にもなる）のを防ぐ
    transaction: true,
  }),
  socialProviders: {
    github: {
      clientId: requiredEnv("GITHUB_CLIENT_ID"),
      clientSecret: requiredEnv("GITHUB_CLIENT_SECRET"),
    },
    ...(googleLoginEnabled && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // スマホに Google アカウントが複数あるときに、どれでログインするかを毎回選べるようにする
        prompt: "select_account",
      },
    }),
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
    accountLinking: {
      // 設定画面からの連携では、メールアドレスが違う Google（GitHub）アカウントも連携できるようにする。
      // ログイン中の本人が、連携するアカウントでもログインして確かめるので安全。
      // なお、ログイン画面から「同じメールアドレスの別の方法」でログインしたときの自動の連携は、
      // 両方のメールアドレスが確認済みの場合だけ行われる（Better Auth の初期設定のまま）
      allowDifferentEmails: true,
    },
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
    // 連携の解除と、パスキーの一覧・削除・名前の変更は、このアプリで作った処理を使う（src/features/login-methods）
    "/unlink-account",
    "/passkey/list-user-passkeys",
    "/passkey/delete-passkey",
    "/passkey/update-passkey",
    "/get-access-token",
    "/refresh-token",
    "/account-info",
  ],
  plugins: [
    // プレビュー環境では、本番の URL を経由して GitHub・Google でログインする（登録できる戻り先 URL は 1 つだけのため）
    oAuthProxy({ productionURL }),
    passkey({
      rpName: "SNS-learn",
      rpID: new URL(passkeyOrigin).hostname,
      // 署名を確かめるとき、「このサイトの画面から送られたか」も確かめる
      origin: passkeyOrigin,
      authenticatorSelection: {
        // ID を入力せずにログインできるよう、端末にパスキーを保存してもらう（discoverable credential）
        residentKey: "required",
        // 指紋・顔・画面ロックなどで、端末の持ち主かを確かめてもらう
        userVerification: "required",
      },
    }),
    // Server Actions の中で Cookie を正しく設定するためのプラグイン（必ず最後に置く）
    nextCookies(),
  ],
});
