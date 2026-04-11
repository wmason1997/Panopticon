"use client";

import { useState } from "react";
import { useCreateGoal } from "@/lib/queries";

interface AddGoalModalProps {
  onClose: () => void;
}

export function AddGoalModal({ onClose }: AddGoalModalProps) {
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"recurring" | "weekly">("recurring");
  const [targetCount, setTargetCount] = useState(1);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    createGoal.mutate(
      { goal_type: type, title: title.trim(), target_count: targetCount, visibility },
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
                : "one-off goal for this week only"}
            </p>
          </div>

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
