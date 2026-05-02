"use client";

import { useState } from "react";
import { useCreateGoal } from "@/lib/queries";

interface AddGoalModalProps {
  onClose: () => void;
  weekStart?: number; // 0=Sun … 6=Sat, matches user.week_start
}

function getWeekStartDate(weekStartPref: number, weeksBack = 0): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysBack = ((dow - weekStartPref) + 7) % 7 + weeksBack * 7;
  const d = new Date(today);
  d.setDate(today.getDate() - daysBack);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

export function AddGoalModal({ onClose, weekStart = 0 }: AddGoalModalProps) {
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"recurring" | "weekly">("recurring");
  const [targetCount, setTargetCount] = useState(1);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [weeksBack, setWeeksBack] = useState(0);
  const [error, setError] = useState("");

  const selectedWeekStart = getWeekStartDate(weekStart, weeksBack);
  const selectedWeekStartStr = toISODate(selectedWeekStart);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    createGoal.mutate(
      {
        goal_type: type,
        title: title.trim(),
        target_count: targetCount,
        visibility,
        ...(type === "weekly" ? { week_start_date: selectedWeekStartStr } : {}),
      },
      {
        onSuccess: onClose,
        onError: (err) => setError(err.message),
      },
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded border border-zinc-700 bg-zinc-900 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
            new goal
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-xs text-zinc-600 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Run twice this week"
              autoFocus
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
            />
          </div>

          {/* Type toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
              Type
            </span>
            <div className="flex rounded border border-zinc-700 overflow-hidden">
              {(["recurring", "weekly"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                    type === t
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-zinc-600">
              {type === "recurring"
                ? "carries forward every week automatically"
                : "one-off goal for a specific week"}
            </p>
          </div>

          {/* Week selector — only shown for weekly goals */}
          {type === "weekly" && (
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
                Week
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeeksBack((w) => Math.min(w + 1, 4))}
                  className="h-7 w-7 rounded border border-zinc-700 bg-zinc-800 font-mono text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-30"
                  disabled={weeksBack >= 4}
                  aria-label="Previous week"
                >
                  ‹
                </button>
                <span className="flex-1 text-center font-mono text-xs text-zinc-300">
                  {weeksBack === 0 ? "this week" : weeksBack === 1 ? "last week" : `${weeksBack} weeks ago`}
                  <span className="block text-[10px] text-zinc-600">{formatWeekRange(selectedWeekStart)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setWeeksBack((w) => Math.max(w - 1, 0))}
                  className="h-7 w-7 rounded border border-zinc-700 bg-zinc-800 font-mono text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-30"
                  disabled={weeksBack <= 0}
                  aria-label="Next week"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Target count */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
              Target completions
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
                className="h-8 w-8 rounded border border-zinc-700 bg-zinc-800 font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                −
              </button>
              <span className="font-mono text-lg text-zinc-100 w-6 text-center">
                {targetCount}
              </span>
              <button
                type="button"
                onClick={() => setTargetCount(Math.min(99, targetCount + 1))}
                className="h-8 w-8 rounded border border-zinc-700 bg-zinc-800 font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
              Visibility
            </span>
            <div className="flex rounded border border-zinc-700 overflow-hidden">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                    visibility === v
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-zinc-600">
              {visibility === "public"
                ? "goal title visible to your followers"
                : "only completion % is shown publicly"}
            </p>
          </div>

          {error && (
            <p className="font-mono text-xs text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-zinc-700 py-2 font-mono text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="flex-1 rounded border border-green-700 bg-green-900/30 py-2 font-mono text-xs text-green-400 hover:bg-green-900/50 disabled:opacity-50 transition-colors"
            >
              {createGoal.isPending ? "adding…" : "add goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
