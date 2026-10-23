import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import type { ProfileView, UserSummary } from "./types";

const FOLLOW_LIST_LIMIT = 100;

/** @ID からプロフィールを取得する。見つからなければ null */
export async function getProfileByHandle(
  handle: string,
  viewerId: string | null,
): Promise<ProfileView | null> {
  const [row] = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      image: users.image,
      bio: users.bio,
      createdAt: users.createdAt,
      followerCount: db.$count(follows, eq(follows.followingId, users.id)),
      followingCount: db.$count(follows, eq(follows.followerId, users.id)),
      isFollowedByViewer: viewerId
        ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${users.id})`
        : sql<boolean>`false`,
    })
    .from(users)
    .where(eq(users.handle, handle.toLowerCase()));

  if (!row?.handle) return null;
  return {
    ...row,
    handle: row.handle,
    createdAt: row.createdAt.toISOString(),
    isViewer: row.id === viewerId,
  };
}

/** プロフィール編集画面の初期値 */
export async function getEditableProfile(
  userId: string,
): Promise<{ name: string; bio: string } | null> {
  const [row] = await db
    .select({ name: users.name, bio: users.bio })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? null;
}

const userSummaryColumns = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  image: users.image,
  bio: users.bio,
};

type UserSummaryRow = Omit<UserSummary, "handle"> & { handle: string | null };

// 一覧は handle が空でない人だけに絞って取得しているので、ここで空になることはない
function toUserSummary(row: UserSummaryRow): UserSummary {
  return { ...row, handle: row.handle ?? "" };
}

/** この人をフォローしている人の一覧（新しくフォローした順） */
export async function getFollowers(userId: string): Promise<UserSummary[]> {
  const rows = await db
    .select(userSummaryColumns)
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followerId))
    .where(and(eq(follows.followingId, userId), isNotNull(users.handle)))
    .orderBy(desc(follows.createdAt))
    .limit(FOLLOW_LIST_LIMIT);
  return rows.map(toUserSummary);
}

/** この人がフォローしている人の一覧（新しくフォローした順） */
export async function getFollowing(userId: string): Promise<UserSummary[]> {
  const rows = await db
    .select(userSummaryColumns)
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followingId))
    .where(and(eq(follows.followerId, userId), isNotNull(users.handle)))
    .orderBy(desc(follows.createdAt))
    .limit(FOLLOW_LIST_LIMIT);
  return rows.map(toUserSummary);
}
