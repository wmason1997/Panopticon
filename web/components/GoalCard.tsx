"use client";

import { useLogProgress, useDeleteGoal } from "@/lib/queries";
import type { Goal, WeeklyProgress } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  progress: WeeklyProgress | undefined;
}

export function GoalCard({ goal, progress }: GoalCardProps) {
  const logProgress = useLogProgress();
  const deleteGoal = useDeleteGoal();

  const completed = progress?.completed_count ?? 0;
  const target = progress?.target_count ?? goal.target_count;
  const isDone = completed >= target;
  const pct = Math.min(100, Math.round((completed / target) * 100));
  const isSingle = target === 1;

  function handleIncrement() {
    if (isDone) return;
    logProgress.mutate({ goalId: goal.id });
  }

  function handleDelete() {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    deleteGoal.mutate(goal.id);
  }

  return (
    <div
      className={`group relative rounded border p-4 transition-colors ${
        isDone
          ? "border-green-900 bg-green-950/20"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      {/* Type badge + delete */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
          {goal.goal_type}
        </span>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all font-mono text-xs"
          aria-label="Delete goal"
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <p className={`text-sm font-medium mb-4 leading-snug ${isDone ? "text-zinc-400 line-through" : "text-zinc-100"}`}>
        {goal.title}
      </p>

      {/* Progress row */}
      <div className="flex items-center gap-3">
        {isSingle ? (
          /* Single-completion: checkbox style */
          <button
            onClick={handleIncrement}
            disabled={isDone || logProgress.isPending}
            className={`flex h-7 w-7 items-center justify-center rounded border font-mono text-sm transition-colors ${
              isDone
                ? "border-green-700 bg-green-900/40 text-green-400 cursor-default"
                : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-green-600 hover:text-green-400"
            }`}
            aria-label="Mark complete"
          >
            {isDone ? "✓" : "○"}
          </button>
        ) : (
          /* Multi-completion: counter + bar */
          <>
            <button
              onClick={handleIncrement}
              disabled={isDone || logProgress.isPending}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border font-mono text-sm transition-colors ${
                isDone
                  ? "border-green-700 bg-green-900/40 text-green-400 cursor-default"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-green-600 hover:text-green-400"
              }`}
              aria-label="Log progress"
            >
              +
            </button>

            <div className="flex flex-1 flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone ? "bg-green-500" : "bg-green-700"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] text-zinc-500">
                  {completed}
                  <span className="text-zinc-700">/{target}</span>
                </span>
                {isDone && (
                  <span className="font-mono text-[10px] text-green-600 tracking-widest uppercase">
                    done
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Single goal done label */}
        {isSingle && isDone && (
          <span className="font-mono text-[10px] text-green-600 tracking-widest uppercase">
            done
          </span>
        )}
      </div>
    </div>
  );
}
