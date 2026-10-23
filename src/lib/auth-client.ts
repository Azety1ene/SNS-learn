import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

/** ブラウザ側から Better Auth を呼び出すためのクライアント（ログインの開始や、パスキーの登録に使う） */
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});
