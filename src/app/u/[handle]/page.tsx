import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostListSkeleton, ProfileSkeleton } from "@/components/skeletons";
import { Timeline } from "@/features/posts/components/timeline";
import { ProfileHeader } from "@/features/users/components/profile-header";
import { getProfileByHandle } from "@/features/users/queries";
import { getRegisteredViewer } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

/** プロフィール（/u/@ID） */
export default function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <Suspense
      fallback={
        <>
          <ProfileSkeleton />
          <PostListSkeleton />
        </>
      }
    >
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: Pick<PageProps<"/u/[handle]">, "params">) {
  const { handle } = await params;
  // @ID に使えない文字が含まれていれば、DB に問い合わせるまでもなく「見つからない」
  if (!/^[A-Za-z0-9_]{1,30}$/.test(handle)) notFound();

  const viewer = await getRegisteredViewer();
  const profile = await getProfileByHandle(handle, viewer?.id ?? null);
  if (!profile) notFound();

  return (
    <>
      <ProfileHeader profile={profile} canFollow={viewer !== null} />
      <h2 className="sr-only">投稿</h2>
      <Suspense fallback={<PostListSkeleton />}>
        <Timeline
          source={{ type: "user", userId: profile.id }}
          viewerId={viewer?.id ?? null}
          emptyMessage="まだ投稿がありません。"
        />
      </Suspense>
    </>
  );
}
