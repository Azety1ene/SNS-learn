import { googleLoginEnabled } from "@/lib/auth";
import { getLoginMethods } from "../queries";
import { LinkedAccounts } from "./linked-accounts";
import { PasskeyList } from "./passkey-list";

/** 連携に失敗して設定画面に戻ってきたとき（?error=理由）の案内 */
const LINK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "そのアカウントは、すでに別のユーザーに連携されています。",
  unable_to_link_account:
    "連携できませんでした。メールアドレスが確認済みのアカウントだけを連携できます。",
  access_denied: "連携がキャンセルされました。",
};

type LoginMethodsSectionProps = {
  viewerId: string;
  /** 連携に失敗したときの理由（URL の ?error=） */
  linkError?: string;
};

/** 設定画面の「ログイン方法」（Server Component。DB から一覧を読んで、ボタンの部品に渡す） */
export async function LoginMethodsSection({ viewerId, linkError }: LoginMethodsSectionProps) {
  const methods = await getLoginMethods(viewerId);

  return (
    <div className="space-y-6 px-4 py-6">
      {linkError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {LINK_ERROR_MESSAGES[linkError] ?? "連携できませんでした。もう一度お試しください。"}
        </p>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">連携しているアカウント</h3>
        <LinkedAccounts
          linked={methods.accounts.map((account) => account.providerId)}
          googleEnabled={googleLoginEnabled}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-bold">パスキー</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          パスキーを追加すると、次からは指紋や顔認証（または画面ロックの解除）だけでログインできます。パスワードは使いません。
        </p>
        <PasskeyList passkeys={methods.passkeys} />
      </div>
    </div>
  );
}
