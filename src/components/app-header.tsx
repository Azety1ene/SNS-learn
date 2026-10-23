import { Settings } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/session";
import { Avatar } from "./avatar";
import { BottomNav, BottomNavPlaceholder } from "./bottom-nav";

/** 画面上部のヘッダー。サービス名は固定、右側はログイン状態によって変わる */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <Link href="/" className="text-lg font-black tracking-tight text-sky-600 dark:text-sky-400">
        SNS-learn
      </Link>
      {/* Cookie を読む部分だけを Suspense で囲む。ロゴなどはすぐに表示できる */}
      <Suspense fallback={<div className="size-8" />}>
        <HeaderAccount />
      </Suspense>
    </header>
  );
}

async function HeaderAccount() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-700"
      >
        ログイン
      </Link>
    );
  }
  return (
    <Link
      href="/settings"
      aria-label="設定"
      className="flex items-center gap-2 rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
    >
      <Settings className="size-5 text-zinc-500" aria-hidden />
      <Avatar name={viewer.name} image={viewer.image} size={32} />
    </Link>
  );
}

/** 画面下のナビゲーション。プロフィールの URL を決めるためにログイン状態を読む */
export function AppBottomNav() {
  return (
    <Suspense fallback={<BottomNavPlaceholder />}>
      <BottomNavWithViewer />
    </Suspense>
  );
}

async function BottomNavWithViewer() {
  const viewer = await getViewer();
  return <BottomNav profileHref={viewer?.handle ? `/u/${viewer.handle}` : null} />;
}
