"use client";

import { useRef, useState } from "react";
import { useLogProgress, useDeleteGoal, useNotes, useCreateNote, useDeleteNote, useCurrentUser } from "@/lib/queries";
import type { Goal, Note, WeeklyProgress } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  progress: WeeklyProgress | undefined;
}

export function GoalCard({ goal, progress }: GoalCardProps) {
  const logProgress = useLogProgress();
  const deleteGoal = useDeleteGoal();
  const [notesOpen, setNotesOpen] = useState(false);

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
      className={`group relative rounded border transition-colors ${
        isDone
          ? "border-green-900 bg-green-950/20"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <div className="p-4">
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

          {isSingle && isDone && (
            <span className="font-mono text-[10px] text-green-600 tracking-widest uppercase">
              done
            </span>
          )}
        </div>
      </div>

      {/* Notes toggle */}
      <button
        onClick={() => {
          if (!progress) return;
          setNotesOpen((o) => !o);
        }}
        disabled={!progress}
        className={`w-full border-t px-4 py-2 flex items-center gap-2 transition-colors font-mono text-[10px] tracking-widest uppercase ${
          !progress
            ? "border-zinc-800/50 text-zinc-700 cursor-default"
            : notesOpen
            ? "border-zinc-700 text-zinc-400 hover:text-zinc-300"
            : "border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
        }`}
      >
        <span>{notesOpen ? "▲" : "▼"}</span>
        <span>{progress ? "notes" : "log progress to add notes"}</span>
      </button>

      {/* Notes panel */}
      {notesOpen && progress && (
        <NotesPanel progressId={progress.id} />
      )}
    </div>
  );
}

// ─── Notes panel ─────────────────────────────────────────────────────────────

function NotesPanel({ progressId }: { progressId: string }) {
  const { data: me } = useCurrentUser();
  const { data: notes = [], isLoading } = useNotes(progressId, true);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const [draft, setDraft] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPremium = me?.subscription_tier === "premium";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    createNote.mutate(
      { weekly_progress_id: progressId, content, is_public: isPremium && isPublic },
      { onSuccess: () => setDraft("") },
    );
  }

  return (
    <div className="border-t border-zinc-800 px-4 py-3 flex flex-col gap-3">
      {/* Existing notes */}
      {isLoading ? (
        <span className="font-mono text-[10px] text-zinc-700 animate-pulse">loading…</span>
      ) : notes.length === 0 ? (
        <span className="font-mono text-[10px] text-zinc-700">no notes yet.</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onDelete={() => deleteNote.mutate({ noteId: note.id, progressId })}
              isDeleting={deleteNote.isPending}
            />
          ))}
        </ul>
      )}

      {/* New note form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="add a note… (⌘↵ to save)"
          rows={2}
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between">
          {/* Public toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isPremium}
              onClick={() => isPremium && setIsPublic((v) => !v)}
              title={isPremium ? undefined : "public notes — premium feature"}
              className={`font-mono text-[10px] tracking-widest uppercase transition-colors ${
                !isPremium
                  ? "text-zinc-700 cursor-default"
                  : isPublic
                  ? "text-green-500"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {!isPremium ? "⌠ public" : isPublic ? "● public" : "○ private"}
            </button>
            {!isPremium && (
              <span className="font-mono text-[9px] text-zinc-700">premium</span>
            )}
          </div>

          <button
            type="submit"
            disabled={!draft.trim() || createNote.isPending}
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:border-green-700 hover:text-green-400 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            {createNote.isPending ? "saving…" : "save note"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NoteItem({
  note,
  onDelete,
  isDeleting,
}: {
  note: Note;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <li className="group/note flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
          {note.content}
        </p>
        {note.is_public && (
          <span className="font-mono text-[9px] text-green-700 tracking-widest uppercase">
            public
          </span>
        )}
      </div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="opacity-0 group-hover/note:opacity-100 text-zinc-700 hover:text-red-500 transition-all font-mono text-[10px] flex-shrink-0 pt-0.5"
        aria-label="Delete note"
      >
        ✕
      </button>
    </li>
  );
}
