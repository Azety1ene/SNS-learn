import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";
import { db } from "@/db";

// 各テストの前に全テーブルを空にして、テストどうしが影響し合わないようにする
beforeEach(async () => {
  await db.execute(sql`
    truncate table users, sessions, accounts, verifications, rate_limits, posts, likes, follows
    restart identity cascade
  `);
});
