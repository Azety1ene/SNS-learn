import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, passkeys } from "@/db/schema";
import { createUser } from "../../../tests/support/factories";
import { deletePasskey, unlinkAccount } from "./mutations";
import { getLoginMethods } from "./queries";

/** 外部アカウントの連携を直接追加する（GitHub・Google のログイン画面はテストで通れないため） */
async function linkAccount(userId: string, providerId: "github" | "google") {
  await db.insert(accounts).values({
    id: randomUUID(),
    userId,
    providerId,
    accountId: randomUUID(),
  });
}

/** パスキーを直接追加する（端末とのやりとりは E2E テストで確かめる） */
async function addPasskey(userId: string, name: string) {
  const [row] = await db
    .insert(passkeys)
    .values({
      id: randomUUID(),
      name,
      userId,
      publicKey: "dGVzdC1wdWJsaWMta2V5",
      credentialID: randomUUID(),
      counter: 0,
      deviceType: "multiDevice",
      backedUp: true,
    })
    .returning();
  return row;
}

async function providersOf(userId: string) {
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return rows.map((row) => row.providerId).sort();
}

describe("getLoginMethods", () => {
  it("連携しているアカウントとパスキーを、追加した順に返す", async () => {
    const alice = await createUser();
    await linkAccount(alice.id, "github");
    await linkAccount(alice.id, "google");
    await addPasskey(alice.id, "iPhone");
    await addPasskey(alice.id, "Mac");
    // 他の人のものは含まれない
    const bob = await createUser();
    await linkAccount(bob.id, "github");
    await addPasskey(bob.id, "Android");

    const methods = await getLoginMethods(alice.id);
    expect(methods.accounts.map((a) => a.providerId)).toEqual(["github", "google"]);
    expect(methods.passkeys.map((p) => p.name)).toEqual(["iPhone", "Mac"]);
  });
});

describe("unlinkAccount", () => {
  it("2 つ以上連携していれば解除できる", async () => {
    const alice = await createUser();
    await linkAccount(alice.id, "github");
    await linkAccount(alice.id, "google");

    await unlinkAccount(alice.id, "google");
    expect(await providersOf(alice.id)).toEqual(["github"]);
  });

  it("最後の 1 つは解除できない（パスキーがあっても）", async () => {
    const alice = await createUser();
    await linkAccount(alice.id, "github");
    await addPasskey(alice.id, "iPhone");

    await expect(unlinkAccount(alice.id, "github")).rejects.toThrow("最後の 1 つは解除できません");
    expect(await providersOf(alice.id)).toEqual(["github"]);
  });

  it("連携していないアカウントや、知らない種類は解除できない", async () => {
    const alice = await createUser();
    await linkAccount(alice.id, "github");
    await linkAccount(alice.id, "google");
    const bob = await createUser();

    await expect(unlinkAccount(bob.id, "github")).rejects.toThrow("連携されていません");
    await expect(unlinkAccount(alice.id, "twitter")).rejects.toThrow("連携の種類が正しくありません");
    expect(await providersOf(alice.id)).toEqual(["github", "google"]);
  });

  it("GitHub と Google の解除が同時に届いても、片方だけが解除される（行のロック）", async () => {
    const alice = await createUser();
    await linkAccount(alice.id, "github");
    await linkAccount(alice.id, "google");

    const results = await Promise.allSettled([
      unlinkAccount(alice.id, "github"),
      unlinkAccount(alice.id, "google"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await providersOf(alice.id)).toHaveLength(1);
  });
});

describe("deletePasskey", () => {
  it("自分のパスキーは削除でき、他人のパスキーは削除できない", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const alicePasskey = await addPasskey(alice.id, "iPhone");

    expect(await deletePasskey(bob.id, alicePasskey.id)).toBe(false);
    expect(await getLoginMethods(alice.id)).toMatchObject({ passkeys: [{ name: "iPhone" }] });

    expect(await deletePasskey(alice.id, alicePasskey.id)).toBe(true);
    expect((await getLoginMethods(alice.id)).passkeys).toEqual([]);
  });
});
