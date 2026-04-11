"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useCurrentUser, useUpdateUser } from "@/lib/queries";
import { Header } from "@/components/Header";

const WEEK_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Common IANA timezones grouped for usability
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function Settings() {
  const router = useRouter();
  const { data: user, error: userError, isLoading } = useCurrentUser();
  const updateUser = useUpdateUser();

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [publishTime, setPublishTime] = useState("00:00");
  const [weekStart, setWeekStart] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (userError instanceof ApiError && userError.status === 401) {
      router.replace("/");
    }
  }, [userError, router]);

  // Seed form from user data on load
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setTimezone(user.timezone);
      setPublishTime(user.publish_time);
      setWeekStart(user.week_start);
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    updateUser.mutate(
      { display_name: displayName.trim(), timezone, publish_time: publishTime, week_start: weekStart },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(err.message),
      },
    );
  }

  if (isLoading || !user) {
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
      <Header user={user} />

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-8">
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
            configuration
          </p>
          <h1 className="font-mono text-sm text-zinc-300">Settings</h1>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-8">

          {/* Profile section */}
          <Section title="profile">
            <Field label="Display name">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email" hint="managed by Google — cannot be changed here">
              <input
                type="text"
                value={user.email}
                disabled
                className={`${inputClass} opacity-40 cursor-not-allowed`}
              />
            </Field>
          </Section>

          {/* Publish cycle section */}
          <Section title="publish cycle">
            <p className="font-mono text-[11px] text-zinc-600 leading-relaxed">
              Progress is private until your daily publish time. Others only
              see your last published snapshot — not what time you worked on things.
            </p>

            <Field label="Timezone">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={selectClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>

            <Field label="Publish time" hint="HH:MM in your local timezone">
              <input
                type="time"
                value={publishTime}
                onChange={(e) => setPublishTime(e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          {/* Week section */}
          <Section title="week">
            <Field label="Week starts on">
              <select
                value={weekStart}
                onChange={(e) => setWeekStart(Number(e.target.value))}
                className={selectClass}
              >
                {WEEK_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* Account section */}
          <Section title="account">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-zinc-400">Subscription</p>
                <p className="font-mono text-[11px] text-zinc-600 mt-0.5">
                  {user.subscription_tier === "premium" ? "Premium" : "Free tier"}
                </p>
              </div>
              {user.subscription_tier === "free" && (
                <span className="font-mono text-[10px] text-zinc-600 border border-zinc-700 rounded px-2 py-1">
                  upgrade coming soon
                </span>
              )}
            </div>
          </Section>

          {error && (
            <p className="font-mono text-xs text-red-500">{error}</p>
          )}

          {saved && (
            <p className="font-mono text-xs text-green-500">
              &gt; settings saved.
            </p>
          )}

          <button
            type="submit"
            disabled={updateUser.isPending}
            className="w-full rounded border border-green-700 bg-green-900/30 py-3 font-mono text-xs text-green-400 hover:bg-green-900/50 disabled:opacity-50 transition-colors"
          >
            {updateUser.isPending ? "saving…" : "save settings"}
          </button>
        </form>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          {title}
        </span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[10px] text-zinc-700">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-green-600 focus:outline-none placeholder:text-zinc-600";

const selectClass =
  "rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-green-600 focus:outline-none";
