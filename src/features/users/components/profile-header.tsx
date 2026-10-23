import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatYearMonth } from "@/lib/format";
import type { ProfileView } from "../types";
import { FollowButton } from "./follow-button";

type ProfileHeaderProps = {
  profile: ProfileView;
  /** ログインして初回登録も済んでいるか（フォローボタンを出すかどうか） */
  canFollow: boolean;
};

/** プロフィールの上部（アイコン・名前・自己紹介・フォロー数など）。表示だけなので Server Component */
export function ProfileHeader({ profile, canFollow }: ProfileHeaderProps) {
  return (
    <section aria-label="プロフィール" className="border-b border-zinc-200 px-4 py-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <Avatar name={profile.name} image={profile.image} size={72} />
        {profile.isViewer ? (
          <Link
            href="/settings"
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-bold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            プロフィールを編集
          </Link>
        ) : (
          canFollow && (
            <FollowButton targetUserId={profile.id} isFollowing={profile.isFollowedByViewer} />
          )
        )}
      </div>
      <h1 className="mt-3 text-xl font-bold break-words">{profile.name}</h1>
      <p className="text-sm text-zinc-500">@{profile.handle}</p>
      {profile.bio && <p className="mt-3 whitespace-pre-wrap break-words">{profile.bio}</p>}
      <p className="mt-3 text-sm text-zinc-500">{formatYearMonth(profile.createdAt)}から利用しています</p>
      <div className="mt-2 flex gap-4 text-sm">
        <Link href={`/u/${profile.handle}/following`} className="hover:underline">
          <span className="font-bold">{profile.followingCount}</span>{" "}
          <span className="text-zinc-500">フォロー</span>
        </Link>
        <Link href={`/u/${profile.handle}/followers`} className="hover:underline">
          <span className="font-bold">{profile.followerCount}</span>{" "}
          <span className="text-zinc-500">フォロワー</span>
        </Link>
      </div>
    </section>
  );
}
