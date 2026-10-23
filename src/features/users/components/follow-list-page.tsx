import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PostListSkeleton } from "@/components/skeletons";
import { getFollowers, getFollowing, getProfileByHandle } from "../queries";
import { UserList } from "./user-list";

type FollowListPageProps = {
  params: Promise<{ handle: string }>;
  kind: "followers" | "following";
};

/** フォロワー一覧・フォロー中一覧のページで共通の中身 */
export function FollowListPage({ params, kind }: FollowListPageProps) {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <FollowListContent params={params} kind={kind} />
    </Suspense>
  );
}

async function FollowListContent({ params, kind }: FollowListPageProps) {
  const { handle } = await params;
  if (!/^[A-Za-z0-9_]{1,30}$/.test(handle)) notFound();

  const profile = await getProfileByHandle(handle, null);
  if (!profile) notFound();

  const users =
    kind === "followers" ? await getFollowers(profile.id) : await getFollowing(profile.id);
  const title = kind === "followers" ? "フォロワー" : "フォロー中";

  return (
    <>
      <PageHeader title={`${profile.name} の${title}`} backHref={`/u/${profile.handle}`} />
      <UserList
        users={users}
        emptyMessage={kind === "followers" ? "まだフォロワーはいません。" : "まだ誰もフォローしていません。"}
      />
    </>
  );
}
