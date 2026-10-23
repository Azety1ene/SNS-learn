import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** テスト全体の最初に 1 回だけ、テスト用 DB にマイグレーションを適用する */
export default async function setup() {
  const pool = new pg.Pool({
    connectionString:
      process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/sns_test",
    max: 1,
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
