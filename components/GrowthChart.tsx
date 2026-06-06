"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface WeekBar {
  start: Date;
  total: number;
  active: number; // active days in the week
  after: boolean; // on/after the join date
}

/**
 * Weekly submission bars over the last ~year, split at the user's LeetRun join
 * date so they can see their consistency and growth *before* vs *after* joining
 * the platform. Pre-join weeks are muted; post-join weeks are indigo.
 */
export default function GrowthChart({
  calendar,
  joinDate,
  weeks = 52,
}: {
  calendar: string | Record<string, number> | null | undefined;
  joinDate: string | Date | null | undefined;
  weeks?: number;
}) {
  const data = useMemo(() => {
    // Parse + bucket calendar into daily counts.
    let raw: Record<string, number> = {};
    if (typeof calendar === "string") {
      try {
        const parsed = JSON.parse(calendar);
        if (parsed && typeof parsed === "object") raw = parsed;
      } catch {
        /* ignore */
      }
    } else if (calendar && typeof calendar === "object") {
      raw = calendar;
    }

    const bucket: Record<string, number> = {};
    for (const [ts, count] of Object.entries(raw)) {
      const d = new Date(parseInt(ts, 10) * 1000);
      if (Number.isNaN(d.getTime())) continue;
      bucket[dayKey(d)] = (bucket[dayKey(d)] || 0) + (Number(count) || 0);
    }

    const join = joinDate ? new Date(joinDate) : null;
    if (join) join.setHours(0, 0, 0, 0);

    // Build week windows ending with the current week (Sunday start).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const bars: WeekBar[] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const start = new Date(thisWeekStart);
      start.setDate(thisWeekStart.getDate() - w * 7);
      let total = 0;
      let active = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + d);
        if (day > today) break;
        const c = bucket[dayKey(day)] || 0;
        if (c > 0) {
          total += c;
          active += 1;
        }
      }
      const after = join ? start >= join || (join >= start && join < new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)) : true;
      bars.push({ start, total, active, after });
    }

    const max = Math.max(1, ...bars.map((b) => b.total));

    // Determine the join week index for the divider marker.
    let joinIndex = -1;
    if (join) {
      joinIndex = bars.findIndex(
        (b) =>
          join >= b.start &&
          join < new Date(b.start.getFullYear(), b.start.getMonth(), b.start.getDate() + 7)
      );
    }

    const before = bars.filter((_, i) => (joinIndex >= 0 ? i < joinIndex : false));
    const after = bars.filter((_, i) => (joinIndex >= 0 ? i >= joinIndex : true));

    const summarize = (arr: WeekBar[]) => {
      if (arr.length === 0) {
        return { weeks: 0, avg: 0, activeRate: 0, total: 0 };
      }
      const total = arr.reduce((s, b) => s + b.total, 0);
      const activeDays = arr.reduce((s, b) => s + b.active, 0);
      return {
        weeks: arr.length,
        avg: total / arr.length,
        activeRate: activeDays / (arr.length * 7),
        total,
      };
    };

    const beforeStats = summarize(before);
    const afterStats = summarize(after);

    // Growth in avg solves/week. null when there is no pre-join baseline.
    let growthPct: number | null = null;
    if (beforeStats.weeks > 0) {
      if (beforeStats.avg === 0) growthPct = afterStats.avg > 0 ? 100 : 0;
      else growthPct = ((afterStats.avg - beforeStats.avg) / beforeStats.avg) * 100;
    }

    // Sparse month labels.
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;
    bars.forEach((b, i) => {
      const m = b.start.getMonth();
      if (m !== lastMonth) {
        labels.push({ index: i, label: MONTHS[m] });
        lastMonth = m;
      }
    });

    return { bars, max, joinIndex, beforeStats, afterStats, growthPct, labels, hasJoin: !!join };
  }, [calendar, joinDate, weeks]);

  const { bars, max, joinIndex, beforeStats, afterStats, growthPct, labels } = data;

  const fmt = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1));

  return (
    <div className="space-y-4">
      {/* Bars */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <div className="flex items-end gap-[3px] h-28">
            {bars.map((b, i) => {
              const h = Math.max(b.total > 0 ? 6 : 2, (b.total / max) * 100);
              const isJoin = i === joinIndex;
              return (
                <div
                  key={i}
                  className="relative flex items-end"
                  style={{ height: "100%" }}
                  title={`Week of ${b.start.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}: ${b.total} submission${b.total === 1 ? "" : "s"}`}
                >
                  {isJoin && (
                    <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-px h-full bg-indigo-500/40" />
                  )}
                  <div
                    className={`w-2 rounded-sm transition-all ${
                      b.after
                        ? "bg-gradient-to-t from-indigo-600 to-violet-400"
                        : "bg-muted-foreground/30"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
          {/* Month axis */}
          <div className="flex gap-[3px] mt-1.5">
            {bars.map((_, i) => {
              const label = labels.find((l) => l.index === i)?.label;
              return (
                <div key={i} className="w-2 text-[8px] text-muted-foreground leading-none text-center">
                  {label ? <span className="inline-block -rotate-0">{label.charAt(0)}</span> : ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" /> Before LeetRun
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-indigo-600 to-violet-400" /> With LeetRun
        </span>
      </div>

      {/* Before vs after comparison */}
      {beforeStats.weeks > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Before LeetRun
            </div>
            <div className="text-xl font-black text-foreground mt-1">
              {fmt(beforeStats.avg)}
              <span className="text-xs font-medium text-muted-foreground"> / week</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {Math.round(beforeStats.activeRate * 100)}% of days active
            </div>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400">
              With LeetRun
            </div>
            <div className="text-xl font-black text-foreground mt-1">
              {fmt(afterStats.avg)}
              <span className="text-xs font-medium text-muted-foreground"> / week</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {Math.round(afterStats.activeRate * 100)}% of days active
            </div>
          </div>

          <div
            className={`rounded-xl p-4 border flex flex-col justify-center ${
              (growthPct ?? 0) >= 0
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-rose-500/5 border-rose-500/20"
            }`}
          >
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Consistency growth
            </div>
            <div
              className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${
                (growthPct ?? 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {(growthPct ?? 0) >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {growthPct === null
                ? "-"
                : `${growthPct >= 0 ? "+" : ""}${Math.round(growthPct)}%`}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              vs. your pre-join pace
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">
              You&apos;ve been here a while - your whole year is on LeetRun.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You averaged{" "}
              <span className="font-bold text-foreground">{fmt(afterStats.avg)}</span>{" "}
              submissions/week with{" "}
              <span className="font-bold text-foreground">
                {Math.round(afterStats.activeRate * 100)}%
              </span>{" "}
              of days active. Keep the streak alive!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
