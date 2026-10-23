import { rm } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";
import { db } from "@/db";

// 各テストの前に全テーブルと保存した画像を空にして、テストどうしが影響し合わないようにする
beforeEach(async () => {
  await db.execute(sql`
    truncate table users, sessions, accounts, verifications, rate_limits, posts, likes, follows, media, post_media
    restart identity cascade
  `);
  await rm(process.env.LOCAL_STORAGE_DIR!, { recursive: true, force: true });
});
