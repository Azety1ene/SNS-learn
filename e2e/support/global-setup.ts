import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { E2E_DATABASE_URL } from "./config";

/** E2E テストの最初に 1 回だけ、テスト用 DB にマイグレーションを適用する */
export default async function globalSetup() {
  const pool = new pg.Pool({ connectionString: E2E_DATABASE_URL, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
