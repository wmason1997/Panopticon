"use client";

import Link from "next/link";
import {
  useCurrentUser,
  useLeaderboard,
  useLeaderboardOptIn,
  useLeaderboardOptOut,
} from "@/lib/queries";
import { Header } from "@/components/Header";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { data: entries = [], isLoading } = useLeaderboard();
  const optIn = useLeaderboardOptIn();
  const optOut = useLeaderboardOptOut();

  const isOptedIn = me?.leaderboard_opt_in ?? false;
  const myRank = me ? entries.findIndex((e) => e.user_id === me.id) : -1;

  if (meLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-mono text-xs text-zinc-600 animate-pulse tracking-widest">
          loading…
        </span>
      </div>
    );
  }

  return (
    <>
      {me && <Header user={me} />}

      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:pb-8 flex flex-col gap-8">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
              rankings
            </p>
            <h1 className="font-mono text-sm text-zinc-300">Leaderboard</h1>
            <p className="font-mono text-[11px] text-zinc-600 mt-1 leading-relaxed">
              Ranked by current streak, then lifetime average. Opt in to appear.
            </p>
          </div>

          {/* Opt-in / opt-out toggle */}
          {me && (
            <button
              onClick={() =>
                isOptedIn ? optOut.mutate() : optIn.mutate()
              }
              disabled={optIn.isPending || optOut.isPending}
              className={`font-mono text-xs px-4 py-2 rounded border transition-colors disabled:opacity-50 flex-shrink-0 ${
                isOptedIn
                  ? "border-zinc-700 text-zinc-400 hover:border-red-800 hover:text-red-400"
                  : "border-green-800 text-green-400 hover:bg-green-900/30"
              }`}
            >
              {optIn.isPending || optOut.isPending
                ? "…"
                : isOptedIn
                ? "leave rankings"
                : "+ join rankings"}
            </button>
          )}
        </div>

        {/* Your rank callout — only if opted in and on the board */}
        {isOptedIn && myRank >= 0 && (
          <div className="rounded border border-green-900 bg-green-950/30 px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-xs text-green-400">your rank</span>
            <span className="font-mono text-lg font-bold text-green-400">
              #{myRank + 1}
            </span>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="font-mono text-xs text-zinc-600 animate-pulse tracking-widest">
              loading…
            </span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="font-mono text-sm text-zinc-500">no one on the board yet.</p>
            <p className="font-mono text-xs text-zinc-700 text-center max-w-xs leading-relaxed">
              Be the first to join — hit "+ join rankings" above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-zinc-800 rounded overflow-hidden border border-zinc-800">
            {/* Column headers */}
            <div className="bg-zinc-900 px-4 py-2 grid grid-cols-[2rem_1fr_5rem_5rem] gap-3 items-center">
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">#</span>
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">user</span>
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest text-right">streak</span>
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest text-right">lifetime</span>
            </div>

            {entries.map((entry, i) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                rank={i + 1}
                isMe={me?.id === entry.user_id}
              />
            ))}
          </div>
        )}

      </main>
    </>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const rankColor =
    rank === 1 ? "text-yellow-400"
    : rank === 2 ? "text-zinc-300"
    : rank === 3 ? "text-amber-600"
    : "text-zinc-600";

  return (
    <Link
      href={`/profile/${entry.user_id}`}
      className={`px-4 py-3 grid grid-cols-[2rem_1fr_5rem_5rem] gap-3 items-center transition-colors hover:bg-zinc-800 ${
        isMe ? "bg-green-950/20" : "bg-zinc-900"
      }`}
    >
      {/* Rank */}
      <span className={`font-mono text-xs font-bold tabular-nums ${rankColor}`}>
        {rank <= 3 ? medal(rank) : `${rank}`}
      </span>

      {/* Identity */}
      <div className="flex items-center gap-3 min-w-0">
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.display_name}
            referrerPolicy="no-referrer"
            className="h-6 w-6 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400 flex-shrink-0">
            {entry.display_name[0]?.toUpperCase()}
          </div>
        )}
        <span className={`font-mono text-xs truncate ${isMe ? "text-green-400" : "text-zinc-300"}`}>
          {entry.display_name}
          {isMe && <span className="text-zinc-600 ml-1">(you)</span>}
        </span>
      </div>

      {/* Streak */}
      <div className="text-right">
        <span className="font-mono text-xs text-zinc-200 tabular-nums">
          {entry.current_streak}
        </span>
        <span className="font-mono text-[9px] text-zinc-600 ml-1">w</span>
      </div>

      {/* Lifetime avg */}
      <div className="text-right">
        <span className="font-mono text-xs text-zinc-400 tabular-nums">
          {entry.lifetime_avg_pct !== null
            ? `${Math.round(entry.lifetime_avg_pct)}%`
            : "—"}
        </span>
      </div>
    </Link>
  );
}

function medal(rank: number): string {
  if (rank === 1) return "1";
  if (rank === 2) return "2";
  return "3";
}
