"use client";

// 投稿のリンクを共有するボタン。
// スマホでは OS の共有メニュー（LINE などへ送れる画面）を開き、それがないブラウザではリンクをコピーする。
// どちらもブラウザの機能（Web Share API・クリップボード）なので Client Component にしている。

import { Share } from "lucide-react";
import { useEffect, useState } from "react";

type ShareButtonProps = {
  /** 共有するページのパス（例: /posts/12） */
  path: string;
  /** 共有メニューに表示するタイトル */
  title: string;
};

export function ShareButton({ path, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  // 「コピーしました」は 2 秒で消す
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // 共有メニューを閉じた（キャンセルした）ときも、ここに来る。何もしない
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // クリップボードが使えないブラウザでは、URL を表示して手でコピーしてもらう
      window.prompt("このリンクをコピーしてください", url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="投稿のリンクを共有"
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-500 hover:text-sky-600"
      >
        <Share className="size-4" aria-hidden />
      </button>
      <span role="status" className="text-xs text-zinc-500">
        {copied ? "リンクをコピーしました" : ""}
      </span>
    </>
  );
}
