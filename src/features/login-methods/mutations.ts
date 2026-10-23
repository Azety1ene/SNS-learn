import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, passkeys, users } from "@/db/schema";
import { firstIssueMessage, UserFacingError } from "@/lib/errors";
import { passkeyIdSchema, providerIdSchema } from "./validation";

/**
 * 外部アカウント（GitHub・Google）の連携を解除する。
 * ログインできなくなるのを防ぐため、最後の 1 つは解除できない。
 * （パスキーだけが残る状態も認めない。パスキーをなくすと、新しい端末からログインする方法がなくなるため）
 */
export async function unlinkAccount(userId: string, providerId: unknown): Promise<void> {
  const provider = providerIdSchema.safeParse(providerId);
  if (!provider.success) throw new UserFacingError(firstIssueMessage(provider.error));

  await db.transaction(async (tx) => {
    // このユーザーの行をロックして（SELECT ... FOR UPDATE）、同じ人の「解除」を 1 つずつ順番に処理する。
    // ロックしないと、GitHub と Google の解除が同時に届いたとき、どちらも「もう 1 つ残っている」と
    // 判断して両方とも解除し、ログインできなくなってしまう。
    // ロックするのはこの人の行だけなので、ほかの人の操作は待たされない
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user) throw new UserFacingError("ユーザーが見つかりません");

    const linked = await tx
      .select({ providerId: accounts.providerId })
      .from(accounts)
      .where(eq(accounts.userId, userId));
    if (!linked.some((account) => account.providerId === provider.data)) {
      throw new UserFacingError("このアカウントは連携されていません");
    }
    if (linked.length <= 1) {
      throw new UserFacingError("ログインできなくなるため、最後の 1 つは解除できません");
    }

    await tx
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, provider.data)));
  });
}

/** 自分のパスキーを削除する。削除できたら true（他人のパスキーや存在しないパスキーなら false） */
export async function deletePasskey(userId: string, passkeyId: unknown): Promise<boolean> {
  const id = passkeyIdSchema.safeParse(passkeyId);
  if (!id.success) return false;

  // 「ID が一致し、かつ持ち主が自分」という条件で削除するので、他人のパスキーは消せない
  const deleted = await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, id.data), eq(passkeys.userId, userId)))
    .returning({ id: passkeys.id });
  return deleted.length > 0;
}
