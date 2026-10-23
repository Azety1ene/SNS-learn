import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// /api/auth/ 以下へのアクセス（ログイン開始・GitHub からの戻り・ログアウトなど）を Better Auth に任せる
export const { GET, POST } = toNextJsHandler(auth);
