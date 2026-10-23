"use client";

// 予期しないエラーが起きたときに、ページの代わりに表示する画面。
// エラーの詳細は利用者には見せず、サーバーのログで確認する。

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">問題が発生しました</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        時間をおいて、もう一度お試しください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
      >
        もう一度読み込む
      </button>
    </div>
  );
}
