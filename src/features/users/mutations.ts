import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import {
  firstIssueMessage,
  getPgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  UserFacingError,
} from "@/lib/errors";
import { onboardingSchema, profileSchema } from "./validation";

/** 初回登録: @ID と表示名を決める。@ID は一度決めたら変えられない */
export async function completeOnboarding(
  userId: string,
  input: { handle: unknown; name: unknown },
): Promise<{ handle: string }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(firstIssueMessage(parsed.error));

  try {
    const updated = await db
      .update(users)
      .set({ handle: parsed.data.handle, name: parsed.data.name })
      // handle がまだ空の場合だけ更新する（登録済みの @ID を上書きさせない）
      .where(and(eq(users.id, userId), isNull(users.handle)))
      .returning({ handle: users.handle });
    if (updated.length === 0) throw new UserFacingError("すでに登録が済んでいます");
  } catch (error) {
    // 同じ @ID を同時に取ろうとした場合も、DB の一意制約が最後に防いでくれる
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new UserFacingError("このIDはすでに使われています");
    }
    throw error;
  }
  return { handle: parsed.data.handle };
}

/** プロフィール（表示名と自己紹介）を更新する */
export async function updateProfile(
  userId: string,
  input: { name: unknown; bio: unknown },
): Promise<void> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(firstIssueMessage(parsed.error));

  await db
    .update(users)
    .set({ name: parsed.data.name, bio: parsed.data.bio })
    .where(eq(users.id, userId));
}

/** フォローする／やめる。「この状態にする」形なので、同じ操作が 2 回届いても結果は変わらない */
export async function setFollow(
  followerId: string,
  followingId: string,
  following: boolean,
): Promise<void> {
  if (followerId === followingId) throw new UserFacingError("自分はフォローできません");

  if (!following) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return;
  }

  try {
    await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  } catch (error) {
    if (getPgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new UserFacingError("ユーザーが見つかりません");
    }
    throw error;
  }
}
