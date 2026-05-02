"use client";

import { useMemo, useState } from "react";
import type { ActivityPoint } from "@/lib/types";

interface ActivityHeatmapProps {
  data: ActivityPoint[];
  selectedWeek?: string | null;
  onWeekClick?: (weekDate: string) => void;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKS_SHOWN = 52;

function completionPct(point: ActivityPoint | undefined): number | null {
  if (!point || !point.target || point.target === 0) return null;
  return Math.min(1, (point.completed ?? 0) / point.target);
}

function cellColor(pct: number | null, isFuture: boolean): string {
  if (isFuture || pct === null) return "bg-zinc-800";
  if (pct === 0)   return "bg-zinc-800";
  if (pct < 0.25)  return "bg-green-950";
  if (pct < 0.50)  return "bg-green-900";
  if (pct < 0.75)  return "bg-green-700";
  if (pct < 1.0)   return "bg-green-500";
  return "bg-green-400";
}

function toSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ActivityHeatmap({ data, selectedWeek, onWeekClick }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Build a lookup map: week_start_date string → point
  const byDate = useMemo(() => {
    const m = new Map<string, ActivityPoint>();
    for (const p of data) m.set(p.week_start_date, p);
    return m;
  }, [data]);

  // Generate the 52 week cells, ending with the most recent Sunday
  const weeks = useMemo(() => {
    const today = new Date();
    const latest = toSunday(today);
    const cells: Date[] = [];
    for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
      const d = new Date(latest);
      d.setDate(latest.getDate() - i * 7);
      cells.push(d);
    }
    return cells;
  }, []);

  const todayKey = useMemo(() => dateKey(toSunday(new Date())), []);

  // Compute month label positions: first week of each new month
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((d, i) => {
      if (d.getMonth() !== lastMonth) {
        labels.push({ month: MONTHS[d.getMonth()], col: i });
        lastMonth = d.getMonth();
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="relative h-5 mb-1" style={{ display: "grid", gridTemplateColumns: `repeat(${WEEKS_SHOWN}, 1fr)` }}>
        {monthLabels.map(({ month, col }) => (
          <span
            key={`${month}-${col}`}
            className="font-mono text-[9px] text-zinc-600 absolute"
            style={{ left: `${(col / WEEKS_SHOWN) * 100}%` }}
          >
            {month}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${WEEKS_SHOWN}, 1fr)` }}
        onMouseLeave={() => setTooltip(null)}
      >
        {weeks.map((weekDate, i) => {
          const key = dateKey(weekDate);
          const isFuture = key > todayKey;
          const point = byDate.get(key);
          const pct = completionPct(point);
          const color = cellColor(pct, isFuture);

          const tooltipText = isFuture
            ? `${key} — future`
            : pct === null
            ? `${key} — no data`
            : `${key} — ${Math.round(pct * 100)}% (${point!.completed ?? 0}/${point!.target})`;

          const isSelected = key === selectedWeek;
          const clickable = !isFuture && pct !== null && onWeekClick;

          return (
            <div
              key={i}
              className={`aspect-square rounded-[2px] transition-opacity ${color} ${
                clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${isSelected ? "ring-1 ring-zinc-400 ring-offset-1 ring-offset-zinc-950" : ""}`}
              onClick={() => clickable && onWeekClick(key)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parent = e.currentTarget.closest(".relative")?.getBoundingClientRect();
                setTooltip({
                  text: tooltipText,
                  x: rect.left - (parent?.left ?? 0) + rect.width / 2,
                  y: rect.top - (parent?.top ?? 0) - 6,
                });
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="font-mono text-[9px] text-zinc-600">less</span>
        {["bg-zinc-800", "bg-green-950", "bg-green-900", "bg-green-700", "bg-green-500", "bg-green-400"].map((c) => (
          <div key={c} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
        ))}
        <span className="font-mono text-[9px] text-zinc-600">more</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
