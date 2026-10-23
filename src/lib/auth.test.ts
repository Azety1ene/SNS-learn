import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { createUser } from "../../tests/support/factories";
import { auth } from "./auth";

// Better Auth が、このアプリのテーブル定義（src/db/schema.ts）で正しく動くかを、本物の DB で確かめる

const githubAccount = (accountId: string) => ({
  providerId: "github",
  accountId,
  accessToken: "test-access-token",
  scope: "read:user,user:email",
});

describe("初めてログインした人の登録", () => {
  it("ユーザーと GitHub アカウントの紐付けを作り、SNS 用の項目には初期値が入る", async () => {
    const ctx = await auth.$context;
    const { user } = await ctx.internalAdapter.createOAuthUser(
      { email: "New.User@Example.com", name: "新しい人", emailVerified: true, image: null },
      githubAccount("1001"),
    );

    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    // メールアドレスは小文字にそろえて保存される
    expect(row.email).toBe("new.user@example.com");
    // @ID は初回登録で決めるので、まだ空
    expect(row.handle).toBeNull();
    expect(row.bio).toBe("");

    const linked = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    expect(linked.map((account) => account.providerId)).toEqual(["github"]);
  });

  it("アカウントの紐付けに失敗したら、ユーザーの作成も取り消される（トランザクション）", async () => {
    const ctx = await auth.$context;
    await ctx.internalAdapter.createOAuthUser(
      { email: "first@example.com", name: "1人目", emailVerified: true, image: null },
      githubAccount("2002"),
    );

    // 同じ GitHub アカウントを別のユーザーに紐付けようとすると、一意制約で失敗する
    await expect(
      ctx.internalAdapter.createOAuthUser(
        { email: "second@example.com", name: "2人目", emailVerified: true, image: null },
        githubAccount("2002"),
      ),
    ).rejects.toThrow();

    // 紐付けが失敗したので、2 人目のユーザーも残っていない（中途半端なデータが残らない）
    const leftover = await db.select().from(users).where(eq(users.email, "second@example.com"));
    expect(leftover).toEqual([]);
  });
});

describe("ログイン状態の確認", () => {
  const secret = process.env.BETTER_AUTH_SECRET ?? "";

  /** Better Auth と同じ方法で署名した Cookie（E2E テストでも同じ方法を使っている） */
  function sessionCookie(token: string, signingSecret = secret) {
    const signature = createHmac("sha256", signingSecret).update(token).digest("base64");
    return `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
  }

  it("正しく署名された Cookie から、ログイン中のユーザーを取り出せる", async () => {
    const alice = await createUser({ handle: "alice" });
    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(alice.id);

    const result = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie(session.token) }),
    });
    expect(result?.user.id).toBe(alice.id);
    // SNS 用に追加した項目も受け取れる
    expect(result?.user.handle).toBe("alice");
  });

  it("署名が正しくない Cookie では、ログインしていない扱いになる", async () => {
    const alice = await createUser();
    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(alice.id);

    const result = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie(session.token, "wrong-secret") }),
    });
    expect(result).toBeNull();
  });
});
