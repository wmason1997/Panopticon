"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  useCurrentUser,
  usePublicProfile,
  useActivityData,
  useFollowing,
  useFollowUser,
  useUnfollowUser,
} from "@/lib/queries";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Header } from "@/components/Header";
import type { ActivityPoint } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);

  const { data: me } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = usePublicProfile(id);
  const { data: activity = [], isLoading: activityLoading } = useActivityData(id);
  const { data: following = [] } = useFollowing();

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const isOwnProfile = me?.id === id;
  const isFollowing = following.some((u) => u.id === id);

  const stats = useMemo(() => computeStats(activity), [activity]);

  if (profileLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-mono text-xs text-zinc-600 animate-pulse tracking-widest">
          loading…
        </span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm text-zinc-500">user not found.</p>
        <Link href="/dashboard" className="font-mono text-xs text-zinc-600 hover:text-zinc-300">
          ← back
        </Link>
      </div>
    );
  }

  return (
    <>
      {me && <Header user={me} />}

      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:pb-8 flex flex-col gap-8">

        {/* Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border border-zinc-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center font-mono text-xl text-zinc-400">
                {profile.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-mono text-base font-semibold text-zinc-100">
                {profile.display_name}
              </h1>
              <p className="font-mono text-[11px] text-zinc-600 mt-0.5">
                joined {formatDate(profile.created_at)}
              </p>
            </div>
          </div>

          {/* Follow button — only shown to logged-in users viewing someone else */}
          {me && !isOwnProfile && (
            <button
              onClick={() =>
                isFollowing
                  ? unfollowUser.mutate(id)
                  : followUser.mutate(id)
              }
              disabled={followUser.isPending || unfollowUser.isPending}
              className={`font-mono text-xs px-4 py-2 rounded border transition-colors disabled:opacity-50 ${
                isFollowing
                  ? "border-zinc-700 text-zinc-400 hover:border-red-800 hover:text-red-400"
                  : "border-green-800 text-green-400 hover:bg-green-900/30"
              }`}
            >
              {isFollowing ? "following" : "+ follow"}
            </button>
          )}

          {isOwnProfile && (
            <Link
              href="/settings"
              className="font-mono text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 rounded px-3 py-2 transition-colors"
            >
              edit profile
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-zinc-800 rounded overflow-hidden border border-zinc-800">
          <StatCell
            label="lifetime avg"
            value={stats.lifetimeAvg !== null ? `${Math.round(stats.lifetimeAvg)}%` : "—"}
          />
          <StatCell
            label="current streak"
            value={stats.currentStreak > 0 ? `${stats.currentStreak}w` : "—"}
            hint="weeks ≥ 80%"
          />
          <StatCell
            label="weeks tracked"
            value={String(activity.length)}
          />
        </div>

        {/* Activity heatmap */}
        <div>
          <SectionLabel>activity</SectionLabel>
          {activityLoading ? (
            <div className="h-16 flex items-center">
              <span className="font-mono text-xs text-zinc-700 animate-pulse">loading…</span>
            </div>
          ) : activity.length === 0 ? (
            <p className="font-mono text-xs text-zinc-700">no published activity yet.</p>
          ) : (
            <ActivityHeatmap data={activity} />
          )}
        </div>

        {/* Running averages */}
        {activity.length > 0 && (
          <div>
            <SectionLabel>running averages</SectionLabel>
            <div className="flex flex-col gap-2">
              {[
                { label: "last 4 weeks",  n: 4  },
                { label: "last 13 weeks", n: 13 },
                { label: "last 26 weeks", n: 26 },
                { label: "last 52 weeks", n: 52 },
              ].map(({ label, n }) => {
                const avg = runningAvg(activity, n);
                if (avg === null) return null;
                return (
                  <div key={n} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-zinc-600 w-28">{label}</span>
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-700 rounded-full"
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400 w-8 text-right">
                      {Math.round(avg)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-zinc-900 px-4 py-4 flex flex-col gap-1">
      <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">{label}</span>
      <span className="font-mono text-2xl font-bold text-zinc-100">{value}</span>
      {hint && <span className="font-mono text-[9px] text-zinc-700">{hint}</span>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeStats(data: ActivityPoint[]) {
  const weeks = data.filter((d) => d.target && d.target > 0);

  const lifetimeAvg =
    weeks.length > 0
      ? (weeks.reduce((sum, d) => sum + (d.completed ?? 0) / d.target!, 0) / weeks.length) * 100
      : null;

  // Streak: consecutive most-recent weeks with ≥ 80%
  const sorted = [...weeks].sort(
    (a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime(),
  );
  let currentStreak = 0;
  for (const w of sorted) {
    if ((w.completed ?? 0) / w.target! >= 0.8) currentStreak++;
    else break;
  }

  return { lifetimeAvg, currentStreak };
}

function runningAvg(data: ActivityPoint[], n: number): number | null {
  const valid = data
    .filter((d) => d.target && d.target > 0)
    .sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime())
    .slice(0, n);

  if (valid.length < Math.min(n, 2)) return null; // not enough data
  return (valid.reduce((sum, d) => sum + (d.completed ?? 0) / d.target!, 0) / valid.length) * 100;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]} ${d.getFullYear()}`;
}
