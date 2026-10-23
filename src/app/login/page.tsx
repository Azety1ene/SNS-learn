import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginButtons } from "@/features/login-methods/components/login-buttons";
import { googleLoginEnabled } from "@/lib/auth";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-6 px-4 py-10">
      {/* すでにログインしている人はホームへ移動させる（パスキーでログインした直後もここで移動する） */}
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {googleLoginEnabled ? "GitHub か Google" : "GitHub"}
          のアカウントでログインします。初めての方は、そのまま新規登録になります。パスキーを登録した方は、パスキーでもログインできます。
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginError searchParams={searchParams} />
      </Suspense>
      <LoginButtons googleEnabled={googleLoginEnabled} />
      <p className="text-xs text-zinc-500">
        このサービスがパスワードを預かることはありません。GitHub や Google
        からは名前・アイコン・メールアドレスだけを受け取ります（メールアドレスは公開されません）。
      </p>
    </div>
  );
}

async function RedirectIfSignedIn() {
  const viewer = await getViewer();
  if (viewer) redirect("/");
  return null;
}

/** ログインに失敗して戻ってきたとき（?error=理由）の案内 */
const ERROR_MESSAGES: Record<string, string> = {
  // 同じメールアドレスの人が別の方法で登録済みで、自動で連携できなかった
  account_not_linked:
    "このメールアドレスは、別のログイン方法ですでに登録されています。前回と同じ方法でログインしてから、設定画面の「ログイン方法」で連携してください。",
  // GitHub や Google の画面で「許可しない」を選んだ
  access_denied: "ログインがキャンセルされました。",
};

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  const message =
    (typeof error === "string" && ERROR_MESSAGES[error]) ||
    "ログインできませんでした。もう一度お試しください。";
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}
