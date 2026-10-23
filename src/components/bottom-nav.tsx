"use client";

// 画面下のナビゲーション。今いるページを強調するために URL を読む必要があり、
// URL はブラウザ側でしか分からないので Client Component にしている。

import { Globe, House, LogIn, type LucideIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: LucideIcon; active: boolean };

function navItems(profileHref: string | null, pathname: string | null): NavItem[] {
  return [
    { href: "/", label: "ホーム", icon: House, active: pathname === "/" },
    {
      href: "/explore",
      label: "みんな",
      icon: Globe,
      active: pathname?.startsWith("/explore") ?? false,
    },
    profileHref
      ? {
          href: profileHref,
          label: "プロフィール",
          icon: UserRound,
          active: pathname?.startsWith(profileHref) ?? false,
        }
      : { href: "/login", label: "ログイン", icon: LogIn, active: pathname === "/login" },
  ];
}

type BottomNavProps = {
  /** ログイン中ならその人のプロフィール URL、未ログインなら null */
  profileHref: string | null;
};

export function BottomNav({ profileHref }: BottomNavProps) {
  const pathname = usePathname();
  return <BottomNavFrame items={navItems(profileHref, pathname)} />;
}

/**
 * 読み込み中に表示するナビ。URL を読まない（＝事前に作っておける）ので、強調表示はしない。
 * usePathname() は URL が決まるまで値が分からないため、<Suspense> の fallback では使えない。
 */
export function BottomNavPlaceholder() {
  return <BottomNavFrame items={navItems(null, null)} />;
}

function BottomNavFrame({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={label} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                active
                  ? "font-bold text-sky-600 dark:text-sky-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
