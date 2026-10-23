import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginButton } from "@/components/login-button";
import { PostListSkeleton } from "@/components/skeletons";
import { PostComposer } from "@/features/posts/components/post-composer";
import { Timeline } from "@/features/posts/components/timeline";
import { getViewer } from "@/lib/session";

// ホーム（/）。ページ自体は async にせず、ログイン状態を読む部分だけを <Suspense> の中に置く。
// こうすると、外枠（ヘッダーなど）を先に表示し、中身はデータが揃いしだい流し込める（ストリーミング）。
export default function HomePage() {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const viewer = await getViewer();
  if (!viewer) return <Welcome />;
  // ログインしたが @ID をまだ決めていない人は、初回登録へ
  if (!viewer.handle) redirect("/onboarding");

  return (
    <>
      <h1 className="sr-only">ホーム</h1>
      <PostComposer />
      {/* 投稿フォームはすぐ出し、タイムラインは DB から取得できしだい表示する */}
      <Suspense fallback={<PostListSkeleton />}>
        <Timeline
          source={{ type: "home" }}
          viewerId={viewer.id}
          emptyMessage="まだ投稿がありません。「みんな」から気になる人を探してフォローしてみましょう。"
        />
      </Suspense>
    </>
  );
}

/** ログインしていない人向けの案内 */
function Welcome() {
  return (
    <div className="space-y-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">ようこそ SNS-learn へ</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          短い文章で、いまの気持ちや出来事を気軽に共有できる SNS です。
        </p>
      </div>
      <LoginButton />
      <p className="text-center text-sm">
        <Link href="/explore" className="text-sky-600 hover:underline dark:text-sky-400">
          ログインせずにみんなの投稿を見る
        </Link>
      </p>
    </div>
  );
}
