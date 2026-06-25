"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Boxes,
  LifeBuoy,
  Settings,
  LogOut,
  Users,
  PlusSquare,
  FileBarChart,
  ClipboardList,
  ArrowLeft,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const userNav: NavItem[] = [
  { href: "/dashboard", label: "Desk", icon: LayoutDashboard, exact: true },
  { href: "/materials", label: "Stock", icon: Boxes },
  { href: "/contact", label: "Help", icon: LifeBuoy },
  { href: "/settings", label: "Account", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Orders", icon: ClipboardList, exact: true },
  { href: "/admin/users", label: "Clients", icon: Users },
  { href: "/admin/materials", label: "Stock", icon: Boxes },
  { href: "/admin/add-request", label: "New", icon: PlusSquare },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart },
];

export default function AppShell({
  children,
  variant = "user",
}: {
  children: ReactNode;
  variant?: "user" | "admin";
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const items = variant === "admin" ? adminNav : userNav;

  const active = (it: NavItem) =>
    it.exact ? pathname === it.href : pathname.startsWith(it.href);

  const email = session?.user?.email || "";
  const initial = (session?.user?.name || email || "T").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Desktop left rail */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-20 flex-col items-center border-r border-clay-500/12 bg-espresso-900/70 backdrop-blur-xl">
        <Link
          href={variant === "admin" ? "/admin" : "/dashboard"}
          className="mt-5 mb-6 flex h-11 w-11 items-center justify-center rounded-lg ring-1 ring-clay-500/30 hover:ring-clay-400/60 transition"
          aria-label="Home"
        >
          <Image src="/logo.png" alt="TakomoCo" width={28} height={28} className="rounded" />
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1.5" aria-label="Primary">
          {items.map((it) => {
            const on = active(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`group relative flex w-16 flex-col items-center gap-1 rounded-lg py-2.5 transition-colors ${
                  on ? "text-clay-300" : "text-cream-500 hover:text-cream-200"
                }`}
              >
                {on && (
                  <span className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r bg-clay-400" />
                )}
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                    on
                      ? "border-clay-500/40 bg-clay-500/15"
                      : "border-transparent group-hover:border-clay-500/20 group-hover:bg-espresso-700/60"
                  }`}
                >
                  <it.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.15em]">
                  {it.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mb-4 flex flex-col items-center gap-3">
          {variant === "admin" && (
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-cream-500 hover:text-cream-200 hover:bg-espresso-700/60 transition"
              title="Exit to site"
            >
              <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          )}
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-500/15 border border-clay-500/30 font-mono text-xs font-bold text-clay-200 hover:bg-clay-500/25 hover:border-clay-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500"
            title={`${email} — Account settings`}
            aria-label="Account settings"
          >
            {initial}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-cream-500 hover:text-red-300 hover:bg-red-500/10 transition"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-clay-500/12 bg-espresso-900/80 backdrop-blur-xl px-4">
        <Link href={variant === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
          <Image src="/logo.png" alt="TakomoCo" width={26} height={26} className="rounded ring-1 ring-clay-500/30" />
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-cream-200">
            TAKOMO<span className="text-clay-400">⁄</span>CO
          </span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-red-300 font-mono text-[10px] uppercase tracking-[0.15em]"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Exit
        </button>
      </div>

      {/* Content */}
      <main id="app-content" className="lg:pl-20 pb-24 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-clay-500/12 bg-espresso-900/85 backdrop-blur-xl"
        aria-label="Primary mobile"
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {items.map((it) => {
            const on = active(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${
                  on ? "text-clay-300" : "text-cream-500"
                }`}
              >
                <it.icon className="h-5 w-5" aria-hidden="true" />
                <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
