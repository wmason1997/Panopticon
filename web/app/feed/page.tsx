"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCurrentUser, useFeed, useFollowing } from "@/lib/queries";
import { Header } from "@/components/Header";
import type { FeedItem } from "@/lib/types";

export default function FeedPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { data: feed = [], isLoading: feedLoading } = useFeed();
  const { data: following = [] } = useFollowing();

  // Group feed items by week_start_date, most recent first
  const grouped = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const item of feed) {
      const key = item.week_start_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort weeks descending
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [feed]);

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

      <main className="mx-auto w-full max-w-2xl px-4 py-8 flex flex-col gap-8">

        <div>
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
            social
          </p>
          <h1 className="font-mono text-sm text-zinc-300">Feed</h1>
        </div>

        {feedLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="font-mono text-xs text-zinc-600 animate-pulse tracking-widest">
              loading…
            </span>
          </div>
        ) : following.length === 0 ? (
          <EmptyState
            message="you're not following anyone yet."
            hint="Visit a user's profile and hit + follow to see their activity here."
          />
        ) : feed.length === 0 ? (
          <EmptyState
            message="nothing published yet."
            hint="Activity appears here once the people you follow publish their weekly progress."
          />
        ) : (
          <div className="flex flex-col gap-8">
            {grouped.map(([week, items]) => (
              <WeekGroup key={week} weekStart={week} items={items} />
            ))}
          </div>
        )}

      </main>
    </>
  );
}

// ─── Week group ─────────────────────────────────────────────────────────────

function WeekGroup({ weekStart, items }: { weekStart: string; items: FeedItem[] }) {
  return (
    <div>
      {/* Week label */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          {formatWeekLabel(weekStart)}
        </span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* User rows */}
      <div className="flex flex-col gap-px bg-zinc-800 rounded overflow-hidden border border-zinc-800">
        {items.map((item) => (
          <FeedRow key={`${item.user_id}-${item.week_start_date}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const pct =
    item.target && item.target > 0
      ? Math.min(100, Math.round(((item.completed ?? 0) / item.target) * 100))
      : null;

  const barColor =
    pct === null ? "bg-zinc-700"
    : pct >= 100  ? "bg-green-400"
    : pct >= 80   ? "bg-green-600"
    : pct >= 50   ? "bg-green-800"
    : "bg-zinc-700";

  return (
    <Link
      href={`/profile/${item.user_id}`}
      className="bg-zinc-900 px-4 py-3 flex items-center gap-4 hover:bg-zinc-800 transition-colors group"
    >
      {/* Avatar */}
      {item.avatar_url ? (
        <img
          src={item.avatar_url}
          alt={item.display_name}
          referrerPolicy="no-referrer"
          className="h-7 w-7 rounded-full flex-shrink-0"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400 flex-shrink-0">
          {item.display_name[0]?.toUpperCase()}
        </div>
      )}

      {/* Name */}
      <span className="font-mono text-xs text-zinc-300 w-32 truncate group-hover:text-zinc-100 transition-colors">
        {item.display_name}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {/* Percentage */}
      <span className="font-mono text-xs text-zinc-500 w-10 text-right tabular-nums">
        {pct !== null ? `${pct}%` : "—"}
      </span>
    </Link>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="font-mono text-sm text-zinc-500">{message}</p>
      <p className="font-mono text-xs text-zinc-700 text-center max-w-xs leading-relaxed">{hint}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatWeekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  const startStr = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const endStr =
    end.getMonth() === d.getMonth()
      ? String(end.getDate())
      : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${startStr}–${endStr}, ${end.getFullYear()}`;
}
