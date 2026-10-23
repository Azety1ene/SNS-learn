import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginButton } from "@/components/login-button";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-6 px-4 py-10">
      {/* すでにログインしている人はホームへ移動させる */}
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          GitHub のアカウントでログインします。初めての方は、そのまま新規登録になります。
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginError searchParams={searchParams} />
      </Suspense>
      <LoginButton />
      <p className="text-xs text-zinc-500">
        このサービスがパスワードを預かることはありません。GitHub からは名前・アイコン・メールアドレスだけを受け取ります（メールアドレスは公開されません）。
      </p>
    </div>
  );
}

async function RedirectIfSignedIn() {
  const viewer = await getViewer();
  if (viewer) redirect("/");
  return null;
}

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      ログインできませんでした。もう一度お試しください。
    </p>
  );
}
