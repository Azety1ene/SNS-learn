"use server";

// ログイン方法の管理（連携の解除・パスキーの削除）の Server Actions。
// 連携の追加とパスキーの追加は、外部のログイン画面や端末とのやりとりが必要なので、
// ブラウザから Better Auth を直接呼ぶ（components/ を参照）

import { refresh } from "next/cache";
import { UserFacingError } from "@/lib/errors";
import { getRegisteredViewer } from "@/lib/session";
import { deletePasskey, unlinkAccount } from "./mutations";

export type LoginMethodResult = { ok: true } | { ok: false; error: string };

export async function unlinkAccountAction(providerId: string): Promise<LoginMethodResult> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ok: false, error: "ログインしてください" };

  try {
    await unlinkAccount(viewer.id, providerId);
  } catch (error) {
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deletePasskeyAction(passkeyId: string): Promise<LoginMethodResult> {
  const viewer = await getRegisteredViewer();
  if (!viewer) return { ok: false, error: "ログインしてください" };

  const deleted = await deletePasskey(viewer.id, passkeyId);
  if (!deleted) return { ok: false, error: "削除できるパスキーが見つかりません" };
  refresh();
  return { ok: true };
}
