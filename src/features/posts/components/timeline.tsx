// タイムライン（Server Component）。
// サーバーの上で DB から最初の 1 ページを取得し、一覧の表示と続きの読み込みは PostList（Client Component）に任せる。

import { getTimeline } from "../queries";
import type { TimelineSource } from "../validation";
import { PostList } from "./post-list";

type TimelineProps = {
  source: TimelineSource;
  viewerId: string | null;
  emptyMessage: string;
};

export async function Timeline({ source, viewerId, emptyMessage }: TimelineProps) {
  const page = await getTimeline(source, viewerId);
  return (
    <PostList
      // 一番新しい投稿が変わったら（投稿・削除したら）一覧を作り直し、最新の 1 ページ目から表示し直す
      key={page.posts[0]?.id ?? "empty"}
      initialPosts={page.posts}
      initialCursor={page.nextCursor}
      source={source}
      viewerId={viewerId}
      emptyMessage={emptyMessage}
    />
  );
}
