"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useCurrentUser, useGoals, useArchivedGoals, useUnarchiveGoal, useProgress, usePublishNow } from "@/lib/queries";
import { Header } from "@/components/Header";
import { GoalCard } from "@/components/GoalCard";
import { AddGoalModal } from "@/components/AddGoalModal";
import { useToast } from "@/components/Toast";

export default function Dashboard() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const { data: user, error: userError, isLoading: userLoading } = useCurrentUser();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: archivedGoals = [] } = useArchivedGoals(showArchived);
  const { data: progress } = useProgress();

  // Last week's start date (YYYY-MM-DD) — needed to fetch progress for past weekly goals
  const lastWeekStartStr = user ? weekStartStr(user.week_start, 1) : null;
  const { data: lastWeekProgress } = useProgress(lastWeekStartStr ?? undefined);
  const publishNow = usePublishNow();
  const unarchiveGoal = useUnarchiveGoal();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (userError instanceof ApiError && userError.status === 401) {
      router.replace("/");
    }
  }, [userError, router]);

  if (userLoading || goalsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="font-mono text-xs text-zinc-600 animate-pulse tracking-widest">
          loading…
        </span>
      </div>
    );
  }

  if (!user) return null;

  // Split goals into current-week vs past-week buckets
  const currentWeekStart = weekStartStr(user.week_start, 0);
  const thisWeekGoals = (goals ?? []).filter(
    (g) => g.goal_type === "recurring" || g.week_start_date === currentWeekStart,
  );
  const pastWeekGoals = (goals ?? []).filter(
    (g) => g.goal_type === "weekly" && g.week_start_date !== currentWeekStart,
  );

  // Progress maps
  const progressMap = new Map((progress ?? []).map((p) => [p.goal_id, p]));
  const lastWeekProgressMap = new Map((lastWeekProgress ?? []).map((p) => [p.goal_id, p]));

  // Week summary stats — current week only
  const totalGoals = thisWeekGoals.length;
  const completedGoals = thisWeekGoals.filter((g) => {
    const p = progressMap.get(g.id);
    const completed = p?.completed_count ?? 0;
    const target = p?.target_count ?? g.target_count;
    return completed >= target;
  }).length;
  const pct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Current week label
  const weekLabel = getWeekLabel(user.week_start);

  return (
    <>
      <Header user={user} />

      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:pb-8 flex flex-col gap-6">
        {/* Week header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
              current week
            </p>
            <h1 className="font-mono text-sm text-zinc-300">{weekLabel}</h1>
          </div>

          {totalGoals > 0 && (
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-zinc-100">
                {pct}
                <span className="text-zinc-600 text-sm">%</span>
              </p>
              <p className="font-mono text-[10px] text-zinc-600">
                {completedGoals}/{totalGoals} complete
              </p>
            </div>
          )}
        </div>

        {/* Week progress bar */}
        {totalGoals > 0 && (
          <div className="h-px w-full bg-zinc-800 relative overflow-hidden rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Goal list */}
        {totalGoals === 0 && pastWeekGoals.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          <div className="flex flex-col gap-3">
            {thisWeekGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={progressMap.get(goal.id)}
              />
            ))}
          </div>
        )}

        {/* Past weekly goals — shown for up to one week after they expire */}
        {pastWeekGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">last week</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="flex flex-col gap-3">
              {pastWeekGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={lastWeekProgressMap.get(goal.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add goal button */}
        {totalGoals > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full rounded border border-dashed border-zinc-700 py-3 font-mono text-xs text-zinc-600 hover:border-green-800 hover:text-green-600 transition-colors"
          >
            + add goal
          </button>
        )}

        {/* Archived goals section */}
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-3 w-full group"
          >
            <span className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest group-hover:text-zinc-500 transition-colors">
              {showArchived ? "▲" : "▼"} archived
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </button>

          {showArchived && (
            <div className="flex flex-col gap-2 mt-3">
              {archivedGoals.length === 0 ? (
                <p className="font-mono text-xs text-zinc-700">no archived goals.</p>
              ) : (
                archivedGoals.map((goal) => (
                  <div key={goal.id} className="relative group/archived">
                    <GoalCard goal={goal} progress={undefined} archived />
                    <button
                      onClick={() => unarchiveGoal.mutate(goal.id)}
                      disabled={unarchiveGoal.isPending}
                      className="absolute top-3 right-4 font-mono text-[10px] text-zinc-700 hover:text-green-500 transition-colors tracking-widest uppercase opacity-0 group-hover/archived:opacity-100"
                    >
                      unarchive
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Publish notice + manual publish */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-[10px] text-zinc-700 text-center">
            &gt; progress publishes daily at {user.publish_time} ({user.timezone})
          </p>
          <button
            onClick={() => {
              if (!confirm("Publish your current progress now? This will make it visible to your followers immediately.")) return;
              publishNow.mutate(undefined, { onSuccess: () => toast("progress published.", "success") });
            }}
            disabled={publishNow.isPending}
            className="font-mono text-[10px] text-zinc-600 hover:text-green-500 transition-colors disabled:opacity-40 tracking-widest uppercase"
          >
            {publishNow.isPending ? "publishing…" : publishNow.isSuccess ? "✓ published" : "publish now"}
          </button>
        </div>
      </main>

      {showAddModal && <AddGoalModal onClose={() => setShowAddModal(false)} weekStart={user.week_start} />}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="font-mono text-xs text-zinc-600 space-y-1">
        <p className="text-zinc-500">no goals set for this week.</p>
        <p>the panopticon sees nothing.</p>
      </div>
      <button
        onClick={onAdd}
        className="rounded border border-green-800 bg-green-950/30 px-6 py-2.5 font-mono text-xs text-green-400 hover:bg-green-950/60 transition-colors"
      >
        + add your first goal
      </button>
    </div>
  );
}

/** Returns a YYYY-MM-DD string for the week start `weeksBack` weeks ago. */
function weekStartStr(weekStartPref: number, weeksBack: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysBack = ((dow - weekStartPref) + 7) % 7 + weeksBack * 7;
  const d = new Date(today);
  d.setDate(today.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekLabel(weekStart: number): string {
  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun
  const daysBack = ((todayDow - weekStart) + 7) % 7;

  const start = new Date(today);
  start.setDate(today.getDate() - daysBack);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d: Date) => `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}
