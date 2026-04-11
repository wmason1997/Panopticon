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

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-mono text-sm font-bold tracking-widest text-green-400">
            PANOPTICON
          </Link>
          <nav className="flex items-center gap-4 hidden sm:flex">
            {navLink("/dashboard", "goals")}
            {navLink("/feed", "feed")}
            {navLink(`/profile/${user.id}`, "profile")}
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
  );
}
