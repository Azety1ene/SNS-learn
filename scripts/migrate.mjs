// drizzle/ にあるマイグレーション（テーブル定義の変更履歴）を、まだ適用していない分だけ DB に適用する。
// Vercel ではデプロイのたびに `vercel-build` から実行される。
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Neon では、マイグレーションには接続プールを通さない直接の接続を使うのが推奨
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL が設定されていません");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("マイグレーションを適用しました");
} finally {
  await pool.end();
}
