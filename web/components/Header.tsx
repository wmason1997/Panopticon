"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/types";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  async function handleLogout() {
    await api.delete("/auth/session");
    qc.clear();
    router.push("/");
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`font-mono text-xs transition-colors ${
        pathname === href
          ? "text-green-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </Link>
  );

  const profileHref = `/profile/${user.id}`;
  const isProfileActive = pathname.startsWith("/profile/");

  const bottomTab = (href: string, label: string, active?: boolean) => {
    const isActive = active ?? pathname === href;
    return (
      <Link
        href={href}
        className={`flex flex-col items-center justify-center gap-0.5 font-mono text-[9px] tracking-widest uppercase transition-colors ${
          isActive ? "text-green-400" : "text-zinc-600 hover:text-zinc-400"
        }`}
      >
        {label}
        {isActive && (
          <span className="h-0.5 w-3 rounded-full bg-green-400" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop / tablet header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-mono text-sm font-bold tracking-widest text-green-400">
              PANOPTICON
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              {navLink("/dashboard", "goals")}
              {navLink("/feed", "feed")}
              {navLink("/leaderboard", "ranks")}
              {navLink(profileHref, "profile")}
              {navLink("/settings", "settings")}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400">
                  {user.display_name[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-xs text-zinc-400 font-mono hidden sm:block">
                {user.display_name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs font-mono text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="grid grid-cols-5 h-14">
          {bottomTab("/dashboard", "goals")}
          {bottomTab("/feed", "feed")}
          {bottomTab("/leaderboard", "ranks")}
          {bottomTab(profileHref, "profile", isProfileActive)}
          {bottomTab("/settings", "settings")}
        </div>
      </nav>
    </>
  );
}
