import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PostListSkeleton } from "@/components/skeletons";
import { Timeline } from "@/features/posts/components/timeline";
import { getRegisteredViewer } from "@/lib/session";

export const metadata: Metadata = { title: "みんなの投稿" };

/** みんなのタイムライン（全員の投稿）。ログインしていなくても見られる */
export default function ExplorePage() {
  return (
    <>
      <PageHeader title="みんなの投稿" />
      <Suspense fallback={<PostListSkeleton />}>
        <EveryoneTimeline />
      </Suspense>
    </>
  );
}

async function EveryoneTimeline() {
  // いいね済みかどうかを表示するために、見ている人を確認する
  const viewer = await getRegisteredViewer();
  return (
    <Timeline
      source={{ type: "everyone" }}
      viewerId={viewer?.id ?? null}
      emptyMessage="まだ投稿がありません。"
    />
  );
}
