"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useCurrentUser,
  useSearchUsers,
  useFollowing,
  useFollowUser,
  useUnfollowUser,
} from "@/lib/queries";
import { Header } from "@/components/Header";
import type { UserSummary } from "@/lib/types";

export default function SearchPage() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const { data: following = [] } = useFollowing();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce: update `query` 300ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: results = [], isFetching } = useSearchUsers(query);
  const followingSet = new Set(following.map((u) => u.id));

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

      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-24 sm:pb-8 flex flex-col gap-6">
        <div>
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
            discover
          </p>
          <h1 className="font-mono text-sm text-zinc-300">Find users</h1>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="search by name…"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
          />
          {isFetching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-600 animate-pulse">
              …
            </span>
          )}
        </div>

        {/* Results */}
        {query.length === 0 ? (
          <p className="font-mono text-xs text-zinc-700 text-center py-8">
            type a name to search
          </p>
        ) : results.length === 0 && !isFetching ? (
          <p className="font-mono text-xs text-zinc-600 text-center py-8">
            no users found for "{query}"
          </p>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-px bg-zinc-800 rounded overflow-hidden border border-zinc-800">
            {results.map((user) => (
              <SearchResult
                key={user.id}
                user={user}
                isMe={me?.id === user.id}
                isFollowing={followingSet.has(user.id)}
              />
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}

function SearchResult({
  user,
  isMe,
  isFollowing,
}: {
  user: UserSummary;
  isMe: boolean;
  isFollowing: boolean;
}) {
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const isPending = followUser.isPending || unfollowUser.isPending;

  return (
    <div className="bg-zinc-900 px-4 py-3 flex items-center gap-4">
      {/* Avatar */}
      <Link href={`/profile/${user.id}`} className="flex-shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-400">
            {user.display_name[0]?.toUpperCase()}
          </div>
        )}
      </Link>

      {/* Name */}
      <Link
        href={`/profile/${user.id}`}
        className="flex-1 font-mono text-sm text-zinc-300 hover:text-zinc-100 transition-colors truncate"
      >
        {user.display_name}
      </Link>

      {/* Follow button */}
      {!isMe && (
        <button
          onClick={() =>
            isFollowing ? unfollowUser.mutate(user.id) : followUser.mutate(user.id)
          }
          disabled={isPending}
          className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 flex-shrink-0 ${
            isFollowing
              ? "border-zinc-700 text-zinc-400 hover:border-red-800 hover:text-red-400"
              : "border-green-800 text-green-400 hover:bg-green-900/30"
          }`}
        >
          {isFollowing ? "following" : "+ follow"}
        </button>
      )}
      {isMe && (
        <span className="font-mono text-[10px] text-zinc-600 flex-shrink-0">you</span>
      )}
    </div>
  );
}
