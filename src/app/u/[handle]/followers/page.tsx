import type { Metadata } from "next";
import { FollowListPage } from "@/features/users/components/follow-list-page";

export const metadata: Metadata = { title: "フォロワー" };

export default function FollowersPage({ params }: PageProps<"/u/[handle]/followers">) {
  return <FollowListPage params={params} kind="followers" />;
}
