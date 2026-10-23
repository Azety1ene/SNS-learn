import type { Metadata } from "next";
import { FollowListPage } from "@/features/users/components/follow-list-page";

export const metadata: Metadata = { title: "フォロー中" };

export default function FollowingPage({ params }: PageProps<"/u/[handle]/following">) {
  return <FollowListPage params={params} kind="following" />;
}
