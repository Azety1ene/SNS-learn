"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { UserFacingError } from "@/lib/errors";
import { getRegisteredViewer, getViewer } from "@/lib/session";
import { completeOnboarding, setFollow, updateAvatar, updateProfile } from "./mutations";

export type FormState = { error?: string; saved?: boolean };

/** 初回登録フォームから呼ばれる。成功したらホームへ移動する */
export async function completeOnboardingAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  try {
    await completeOnboarding(viewer.id, {
      handle: formData.get("handle"),
      name: formData.get("name"),
    });
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
  redirect("/");
}

/** プロフィール編集フォームから呼ばれる */
export async function updateProfileAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { error: "ログインしてください" };

  try {
    await updateProfile(viewer.id, {
      name: formData.get("name"),
      bio: formData.get("bio") ?? "",
    });
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
  refresh();
  return { saved: true };
}

/** アイコンの変更フォームから呼ばれる。画像はブラウザで縮小してから送られてくる */
export async function updateAvatarAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { error: "ログインしてください" };

  try {
    await updateAvatar(viewer.id, formData.get("avatar"));
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message };
    throw error;
  }
  // ヘッダーなど、アイコンを表示している部分を描き直す
  refresh();
  return { saved: true };
}

export type FollowResult = { ok: true } | { ok: false; error: string };

export async function setFollowAction(
  targetUserId: string,
  following: boolean,
): Promise<FollowResult> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ok: false, error: "ログインしてください" };

  const input = z
    .object({ targetUserId: z.string().min(1), following: z.boolean() })
    .safeParse({ targetUserId, following });
  if (!input.success) return { ok: false, error: "ユーザーが見つかりません" };

  try {
    await setFollow(viewer.id, input.data.targetUserId, input.data.following);
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    throw error;
  }
  // フォロワー数などを最新にするため、ページを描き直す
  refresh();
  return { ok: true };
}

/** ログアウト。セッションを DB から消し、Cookie も削除する */
export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
