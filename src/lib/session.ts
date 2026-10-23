import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** いまページを見ている人（ログイン中のユーザー） */
export type Viewer = {
  id: string;
  name: string;
  image: string | null;
  /** 初回登録が済むまでは null */
  handle: string | null;
};

export type RegisteredViewer = Viewer & { handle: string };

/**
 * ログイン中の人を返す。ログインしていなければ null。
 * Cookie を読むので、呼び出す部品は <Suspense> の内側に置く必要がある。
 * cache() により、1 回のリクエストの中で何度呼んでも DB への問い合わせは 1 回だけになる。
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, image, handle } = session.user;
  return { id, name, image: image ?? null, handle: handle ?? null };
});

/** ログインと初回登録が済んだ人だけが見られるページで使う。条件を満たさなければ移動させる */
export async function requireViewer(): Promise<RegisteredViewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.handle) redirect("/onboarding");
  return { ...viewer, handle: viewer.handle };
}

/**
 * Server Actions 用。ログインと初回登録が済んでいなければ null を返す。
 * Server Actions は画面を通さずに直接呼び出すこともできるので、毎回ここで本人確認をする。
 */
export async function getRegisteredViewer(): Promise<RegisteredViewer | null> {
  const viewer = await getViewer();
  if (!viewer?.handle) return null;
  return { ...viewer, handle: viewer.handle };
}
