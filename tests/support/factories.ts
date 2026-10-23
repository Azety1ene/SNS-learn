import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";

/** テスト用のユーザーを作る。handle に null を渡すと「初回登録がまだの人」になる */
export async function createUser(
  overrides: { handle?: string | null; name?: string } = {},
) {
  const id = randomUUID();
  const handle =
    overrides.handle === undefined ? `user_${id.slice(0, 8)}` : overrides.handle;
  const [user] = await db
    .insert(users)
    .values({
      id,
      name: overrides.name ?? "テストユーザー",
      email: `${id}@example.com`,
      emailVerified: true,
      handle,
    })
    .returning();
  return user;
}
