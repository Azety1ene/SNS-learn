import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { signOutAction } from "@/features/users/actions";
import { AvatarForm } from "@/features/users/components/avatar-form";
import { ProfileForm } from "@/features/users/components/profile-form";
import { getEditableProfile } from "@/features/users/queries";
import { requireViewer } from "@/lib/session";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" />
      <Suspense fallback={<FormSkeleton />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  // ログインしていなければログインページへ、初回登録がまだなら初回登録ページへ移動する
  const viewer = await requireViewer();
  const profile = await getEditableProfile(viewer.id);

  return (
    <>
      <section aria-labelledby="avatar-heading">
        <h2 id="avatar-heading" className="px-4 pt-6 font-bold">
          アイコン
        </h2>
        <AvatarForm name={viewer.name} image={viewer.image} />
      </section>
      <section
        aria-labelledby="profile-heading"
        className="border-t border-zinc-200 dark:border-zinc-800"
      >
        <h2 id="profile-heading" className="px-4 pt-6 font-bold">
          プロフィール
        </h2>
        <ProfileForm defaultName={profile?.name ?? viewer.name} defaultBio={profile?.bio ?? ""} />
      </section>
      <section
        aria-labelledby="account-heading"
        className="space-y-3 border-t border-zinc-200 px-4 py-6 dark:border-zinc-800"
      >
        <h2 id="account-heading" className="font-bold">
          アカウント
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">@{viewer.handle} でログインしています。</p>
        {/* Server Action をフォームに直接渡しているので、JavaScript がなくてもログアウトできる */}
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            ログアウト
          </button>
        </form>
      </section>
    </>
  );
}
