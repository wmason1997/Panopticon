"use client";

import { useRef, useState } from "react";
import {
  useLogProgress,
  useDeleteGoal,
  useArchiveGoal,
  useToggleVisibility,
  useNotes,
  useCreateNote,
  useDeleteNote,
  useCurrentUser,
} from "@/lib/queries";
import type { Goal, Note, WeeklyProgress } from "@/lib/types";

interface GoalCardProps {
  goal: Goal;
  progress: WeeklyProgress | undefined;
  /** When true, renders in archived mode: no progress/notes, just title + unarchive hint */
  archived?: boolean;
}

export function GoalCard({ goal, progress, archived = false }: GoalCardProps) {
  const logProgress = useLogProgress();
  const deleteGoal = useDeleteGoal();
  const archiveGoal = useArchiveGoal();
  const toggleVisibility = useToggleVisibility();
  const [notesOpen, setNotesOpen] = useState(false);

  const completed = progress?.completed_count ?? 0;
  const target = progress?.target_count ?? goal.target_count;
  const isDone = completed >= target;
  const pct = Math.min(100, Math.round((completed / target) * 100));
  const isSingle = target === 1;

  function handleDelete() {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    deleteGoal.mutate(goal.id);
  }

  function handleArchive() {
    if (!confirm(`Archive "${goal.title}"? It won't carry forward but your history is kept.`)) return;
    archiveGoal.mutate(goal.id);
  }

  return (
    <div
      className={`group relative rounded border transition-colors ${
        archived
          ? "border-zinc-800/50 bg-zinc-900/50"
          : isDone
          ? "border-green-900 bg-green-950/20"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <div className="p-4">
        {/* Type badge + actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
              {goal.goal_type}
            </span>
            {/* Visibility badge — always visible, muted */}
            {!archived && (
              <span className="font-mono text-[10px] tracking-widest text-zinc-700 uppercase">
                · {goal.visibility}
              </span>
            )}
          </div>
          {!archived && (
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
              {/* Visibility toggle */}
              <button
                onClick={() =>
                  toggleVisibility.mutate({
                    goalId: goal.id,
                    visibility: goal.visibility === "public" ? "private" : "public",
                  })
                }
                disabled={toggleVisibility.isPending}
                className="text-zinc-700 hover:text-zinc-400 transition-colors font-mono text-[10px] tracking-widest uppercase"
                aria-label="Toggle visibility"
              >
                {goal.visibility === "public" ? "make private" : "make public"}
              </button>
              {goal.goal_type === "recurring" && (
                <button
                  onClick={handleArchive}
                  disabled={archiveGoal.isPending}
                  className="text-zinc-700 hover:text-yellow-600 transition-colors font-mono text-[10px] tracking-widest uppercase"
                  aria-label="Archive goal"
                >
                  archive
                </button>
              )}
              <button
                onClick={handleDelete}
                className="text-zinc-700 hover:text-red-500 transition-colors font-mono text-xs"
                aria-label="Delete goal"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <p
          className={`text-sm font-medium leading-snug ${
            archived
              ? "text-zinc-600"
              : isDone
              ? "text-zinc-400 line-through mb-4"
              : "text-zinc-100 mb-4"
          }`}
        >
          {goal.title}
        </p>

        {/* Progress row — active mode only */}
        {!archived && (
          <div className="flex items-center gap-3">
            {isSingle ? (
              <button
                onClick={() => { if (!isDone) logProgress.mutate({ goalId: goal.id }); }}
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
                  onClick={() => { if (!isDone) logProgress.mutate({ goalId: goal.id }); }}
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
                      className={`h-full rounded-full transition-all duration-300 ${isDone ? "bg-green-500" : "bg-green-700"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[11px] text-zinc-500">
                      {completed}<span className="text-zinc-700">/{target}</span>
                    </span>
                    {isDone && (
                      <span className="font-mono text-[10px] text-green-600 tracking-widest uppercase">done</span>
                    )}
                  </div>
                </div>
              </>
            )}
            {isSingle && isDone && (
              <span className="font-mono text-[10px] text-green-600 tracking-widest uppercase">done</span>
            )}
          </div>
        )}
      </div>

      {/* Notes toggle — active mode only */}
      {!archived && (
        <>
          <button
            onClick={() => { if (progress) setNotesOpen((o) => !o); }}
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

          {notesOpen && progress && <NotesPanel progressId={progress.id} />}
        </>
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
          <span className="font-mono text-[9px] text-green-700 tracking-widest uppercase">public</span>
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
