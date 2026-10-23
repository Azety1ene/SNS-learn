import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Vercel の関数が休止する前に、使っていない接続をきちんと閉じてもらう
  attachDatabasePool(pool);
  return pool;
}

// 開発中はファイルを保存するたびにこのモジュールが読み込み直されるので、
// 接続プールを作り直さないよう globalThis に 1 つだけ保持する
const globalForDb = globalThis as unknown as { pool?: Pool };
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
