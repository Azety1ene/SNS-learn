import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { OnboardingForm } from "@/features/users/components/onboarding-form";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "プロフィールを作成" };

/** 初回登録（ログイン直後に @ID と表示名を決める） */
export default function OnboardingPage() {
  return (
    <>
      <PageHeader title="プロフィールを作成" />
      <Suspense fallback={<FormSkeleton />}>
        <OnboardingContent />
      </Suspense>
    </>
  );
}

async function OnboardingContent() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.handle) redirect("/");
  return <OnboardingForm defaultName={viewer.name} />;
}
