import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { test as base } from "@playwright/test";
import pg from "pg";
import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_DATABASE_URL } from "./config";

type TestUser = { id: string; handle: string | null; name: string };

type Fixtures = {
  /** テスト用 DB への接続 */
  db: pg.Pool;
  /** ユーザーを作る（handle に null を渡すと初回登録前の人になる） */
  createUser: (options?: { handle?: string | null; name?: string }) => Promise<TestUser>;
  /** 投稿を作る */
  createPost: (authorId: string, content: string) => Promise<number>;
  /**
   * そのユーザーとしてログインした状態にする。
   * GitHub のログイン画面は自動テストから操作できないので、ログイン完了後と同じ状態（セッションと Cookie）を直接作る。
   */
  signInAs: (user: TestUser) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  db: async ({}, use) => {
    const pool = new pg.Pool({ connectionString: E2E_DATABASE_URL, max: 2 });
    // テストごとに DB を空にして、テストどうしが影響し合わないようにする
    await pool.query(
      "truncate table users, sessions, accounts, verifications, rate_limits, posts, likes, follows, media, post_media restart identity cascade",
    );
    await use(pool);
    await pool.end();
  },

  createUser: async ({ db }, use) => {
    await use(async (options = {}) => {
      const id = randomUUID();
      const handle =
        options.handle === undefined ? `user_${id.slice(0, 8)}` : options.handle;
      const name = options.name ?? "テストユーザー";
      await db.query(
        "insert into users (id, name, email, email_verified, handle) values ($1, $2, $3, true, $4)",
        [id, name, `${id}@example.com`, handle],
      );
      return { id, handle, name };
    });
  },

  createPost: async ({ db }, use) => {
    await use(async (authorId, content) => {
      const result = await db.query<{ id: string }>(
        "insert into posts (author_id, content) values ($1, $2) returning id",
        [authorId, content],
      );
      return Number(result.rows[0].id);
    });
  },

  signInAs: async ({ db, context }, use) => {
    await use(async (user) => {
      const token = randomBytes(24).toString("base64url");
      await db.query(
        "insert into sessions (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')",
        [randomUUID(), token, user.id],
      );
      // Better Auth と同じ方法で Cookie に署名する（値.署名 を URL エンコードしたもの）
      const signature = createHmac("sha256", E2E_AUTH_SECRET).update(token).digest("base64");
      await context.addCookies([
        {
          name: "better-auth.session_token",
          value: encodeURIComponent(`${token}.${signature}`),
          url: E2E_BASE_URL,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    });
  },
});

export { expect } from "@playwright/test";
