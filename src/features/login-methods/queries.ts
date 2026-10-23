import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, passkeys } from "@/db/schema";

export type LoginMethods = {
  /** 連携している外部アカウント（github・google など） */
  accounts: { providerId: string; createdAt: string }[];
  /** 登録してあるパスキー */
  passkeys: { id: string; name: string | null; createdAt: string; backedUp: boolean }[];
};

/** 設定画面に表示する、その人のログイン方法の一覧 */
export async function getLoginMethods(userId: string): Promise<LoginMethods> {
  // 2 つの問い合わせは互いに関係ないので、同時に行う
  const [linkedAccounts, userPasskeys] = await Promise.all([
    db
      .select({ providerId: accounts.providerId, createdAt: accounts.createdAt })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.createdAt)),
    db
      .select({
        id: passkeys.id,
        name: passkeys.name,
        createdAt: passkeys.createdAt,
        backedUp: passkeys.backedUp,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(asc(passkeys.createdAt)),
  ]);
  return {
    accounts: linkedAccounts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    passkeys: userPasskeys.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  };
}
