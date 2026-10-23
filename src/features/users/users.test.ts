import { describe, expect, it } from "vitest";
import { createUser } from "../../../tests/support/factories";
import { completeOnboarding, setFollow, updateProfile } from "./mutations";
import {
  getEditableProfile,
  getFollowers,
  getFollowing,
  getProfileByHandle,
} from "./queries";

describe("completeOnboarding", () => {
  it("@ID と表示名を登録する（@ID は小文字にそろえる）", async () => {
    const user = await createUser({ handle: null });
    await completeOnboarding(user.id, { handle: "Taro_1", name: "たろう" });

    const profile = await getProfileByHandle("taro_1", null);
    expect(profile?.name).toBe("たろう");
  });

  it("すでに使われている @ID は登録できない", async () => {
    await createUser({ handle: "taro" });
    const user = await createUser({ handle: null });

    await expect(completeOnboarding(user.id, { handle: "TARO", name: "たろう" })).rejects.toThrow(
      "このIDはすでに使われています",
    );
  });

  it("登録済みの @ID は変更できない", async () => {
    const user = await createUser({ handle: "first_id" });

    await expect(completeOnboarding(user.id, { handle: "second_id", name: "名前" })).rejects.toThrow(
      "すでに登録が済んでいます",
    );
    expect(await getProfileByHandle("first_id", null)).not.toBeNull();
  });
});

describe("updateProfile", () => {
  it("表示名と自己紹介を更新する", async () => {
    const user = await createUser();
    await updateProfile(user.id, { name: " 新しい名前 ", bio: "よろしくお願いします" });

    expect(await getEditableProfile(user.id)).toEqual({
      name: "新しい名前",
      bio: "よろしくお願いします",
    });
  });

  it("長すぎる自己紹介は保存しない", async () => {
    const user = await createUser();
    await expect(updateProfile(user.id, { name: "名前", bio: "あ".repeat(161) })).rejects.toThrow(
      "自己紹介は160文字以内にしてください",
    );
  });
});

describe("setFollow", () => {
  it("フォローするとフォロー数・フォロワー数に反映され、一覧にも出る", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await setFollow(alice.id, bob.id, true);
    // 同じ操作が 2 回届いても、フォローは 1 つだけ
    await setFollow(alice.id, bob.id, true);

    const bobProfile = await getProfileByHandle(bob.handle!, alice.id);
    expect(bobProfile?.followerCount).toBe(1);
    expect(bobProfile?.isFollowedByViewer).toBe(true);
    expect((await getFollowers(bob.id)).map((user) => user.id)).toEqual([alice.id]);
    expect((await getFollowing(alice.id)).map((user) => user.id)).toEqual([bob.id]);
  });

  it("フォローをやめると一覧から消える", async () => {
    const alice = await createUser();
    const bob = await createUser();
    await setFollow(alice.id, bob.id, true);
    await setFollow(alice.id, bob.id, false);

    expect(await getFollowers(bob.id)).toEqual([]);
  });

  it("自分自身はフォローできない", async () => {
    const alice = await createUser();
    await expect(setFollow(alice.id, alice.id, true)).rejects.toThrow("自分はフォローできません");
  });

  it("存在しないユーザーはフォローできない", async () => {
    const alice = await createUser();
    await expect(setFollow(alice.id, "no-such-user", true)).rejects.toThrow(
      "ユーザーが見つかりません",
    );
  });
});

describe("getProfileByHandle", () => {
  it("初回登録がまだの人や、存在しない @ID は見つからない", async () => {
    expect(await getProfileByHandle("nobody", null)).toBeNull();
  });

  it("自分のプロフィールなら isViewer が true", async () => {
    const alice = await createUser();
    expect((await getProfileByHandle(alice.handle!, alice.id))?.isViewer).toBe(true);
    expect((await getProfileByHandle(alice.handle!, null))?.isViewer).toBe(false);
  });
});
