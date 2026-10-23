// 読み込み中に表示する仮の枠（スケルトン）。<Suspense> の fallback に渡して使う

export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy aria-label="読み込み中" className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-3 px-4 py-4">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy aria-label="読み込み中" className="space-y-3 px-4 py-6">
      <div className="size-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-1/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div aria-busy aria-label="読み込み中" className="space-y-3 px-4 py-6">
      <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 w-1/3 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
