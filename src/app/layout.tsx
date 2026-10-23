import type { Metadata, Viewport } from "next";
import { AppBottomNav, AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SNS-learn", template: "%s | SNS-learn" },
  description: "学習のために作っている、テキスト中心の SNS です。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/** すべてのページに共通する外枠（ヘッダー・本文・下部ナビ） */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col border-zinc-200 sm:border-x dark:border-zinc-800">
          <AppHeader />
          {/* 下部ナビに隠れないよう、下に余白を取る */}
          <main className="flex-1 pb-24">{children}</main>
        </div>
        <AppBottomNav />
      </body>
    </html>
  );
}
