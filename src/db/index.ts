import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createPool() {
  // 接続プール: DB との接続をいくつか作っておき、問い合わせのたびに使い回す。
  // 接続を毎回作るのは時間がかかる（特に Neon は TLS で暗号化して接続する）ため。
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 1 つのサーバー（Vercel の関数 1 台）が同時に使う接続の上限
    max: 10,
    // DB につながらないときに、いつまでも待ち続けないようにする。
    // Neon は休止から起きるのに数秒かかることがあるので、少し長めに 10 秒
    connectionTimeoutMillis: 10_000,
  });
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
