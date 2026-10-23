import { createAuthClient } from "better-auth/react";

/** ブラウザ側から Better Auth を呼び出すためのクライアント（ログイン開始に使う） */
export const authClient = createAuthClient();
