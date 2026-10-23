import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        削除されたか、URL が間違っている可能性があります。
      </p>
      <Link href="/" className="inline-block text-sky-600 hover:underline dark:text-sky-400">
        ホームへ戻る
      </Link>
    </div>
  );
}
