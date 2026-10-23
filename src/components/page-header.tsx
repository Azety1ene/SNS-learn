import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** 各ページの見出し。backHref を渡すと「戻る」リンクを出す */
export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {backHref && (
        <Link
          href={backHref}
          aria-label="戻る"
          className="-ml-2 rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <h1 className="text-lg font-bold">{title}</h1>
    </div>
  );
}
