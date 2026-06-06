"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface DayCell {
  date: string; // YYYY-MM-DD, or "" for padding
  count: number;
}

interface HoverState {
  date: string;
  count: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function prettyDate(key: string): string {
  const d = new Date(key + "T00:00:00");
  if (Number.isNaN(d.getTime())) return key;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

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

// Piano notes mapped to activity intensity levels (C major pentatonic scale).
// count=0 → muted/no sound, 1 → C4, 2 → E4, 3 → G4, 4 → A4, 5 → C5, 6+ → E5
const PIANO_FREQUENCIES = [0, 261.63, 329.63, 392.0, 440.0, 523.25, 659.25];

function playPianoNote(count: number, audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  if (count <= 0) return;
  const freq = PIANO_FREQUENCIES[Math.min(count, PIANO_FREQUENCIES.length - 1)];

  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;

    const now = ctx.currentTime;

    // Oscillator mimicking a piano's fundamental tone
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // A second harmonic to add richness
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, now);

    // Gain envelope: short attack, quick decay to a sustain, then release
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.01);  // attack
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.1); // decay
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7); // release

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
    osc2.start(now);
    osc2.stop(now + 0.4);
  } catch {
    // AudioContext may be unavailable in some environments — fail silently
  }
}

/**
 * GitHub-style yearly contribution grid built from a LeetCode submission
 * calendar (a map of unix-second timestamps -> submission counts). Columns are
 * weeks (oldest left), rows are weekdays (Sun top). Theme-aware and scrollable.
 */
export default function ContributionCalendar({
  calendar,
  weeks = 53,
}: {
  calendar: string | Record<string, number> | null | undefined;
  weeks?: number;
}) {
  const { columns, monthLabels, total, activeDays, max } = useMemo(() => {
    // Parse + bucket the raw calendar into local day keys.
    let raw: Record<string, number> = {};
    if (typeof calendar === "string") {
      try {
        const parsed = JSON.parse(calendar);
        if (parsed && typeof parsed === "object") raw = parsed;
      } catch {
        /* ignore malformed */
      }
    } else if (calendar && typeof calendar === "object") {
      raw = calendar;
    }

    const bucket: Record<string, number> = {};
    for (const [ts, count] of Object.entries(raw)) {
      const d = new Date(parseInt(ts, 10) * 1000);
      if (Number.isNaN(d.getTime())) continue;
      const key = dayKey(d);
      bucket[key] = (bucket[key] || 0) + (Number(count) || 0);
    }

    // Window: the last `weeks*7` days, then pad the front back to Sunday so the
    // first column starts on a Sunday like GitHub.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks * 7 - 1));
    start.setDate(start.getDate() - start.getDay()); // back to Sunday

    const cells: DayCell[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = dayKey(cursor);
      cells.push({ date: key, count: bucket[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Chunk into week columns of 7.
    const cols: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }

    // Month labels: show a label on the first column whose first day is in a
    // new month versus the previous column.
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;
    cols.forEach((col, i) => {
      const first = col[0];
      if (!first?.date) return;
      const month = new Date(first.date + "T00:00:00").getMonth();
      if (month !== lastMonth) {
        labels.push({ index: i, label: MONTHS[month] });
        lastMonth = month;
      }
    });

    let totalCount = 0;
    let active = 0;
    let maxCount = 0;
    for (const c of cells) {
      if (c.count > 0) {
        totalCount += c.count;
        active += 1;
        if (c.count > maxCount) maxCount = c.count;
      }
    }

    return {
      columns: cols,
      monthLabels: labels,
      total: totalCount,
      activeDays: active,
      max: maxCount,
    };
  }, [calendar, weeks]);

  const [hover, setHover] = useState<{ date: string; count: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const heatColor = (count: number) => {
    if (count <= 0) return "bg-muted/50";
    if (count < 2) return "bg-indigo-300/70 dark:bg-indigo-900/80";
    if (count < 4) return "bg-indigo-400 dark:bg-indigo-700";
    if (count < 7) return "bg-indigo-500 dark:bg-indigo-500";
    return "bg-indigo-600 dark:bg-indigo-300";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{total}</span> submissions
          in the last year
        </span>
        <span className="text-xs text-muted-foreground">
          {activeDays} active days · best {max}/day
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 pl-7">
            {columns.map((_, i) => {
              const label = monthLabels.find((m) => m.index === i)?.label;
              return (
                <div
                  key={i}
                  className="w-3 text-[9px] text-muted-foreground leading-none"
                >
                  {label || ""}
                </div>
              );
            })}
          </div>

          {/* Weekday labels + grid */}
          <div className="flex gap-1">
            <div className="flex flex-col gap-1 pr-1 w-6 shrink-0">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <div
                  key={i}
                  className="h-3 text-[9px] text-muted-foreground leading-3"
                >
                  {d}
                </div>
              ))}
            </div>
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((cell, di) => (
                  <div
                    key={`${ci}-${di}`}
                    className={`w-3 h-3 rounded-[3px] transition-shadow ${heatColor(
                      cell.count
                    )} ${
                      cell.date
                        ? "hover:brightness-125 cursor-pointer"
                        : ""
                    }`}
                    onMouseEnter={(e) => {
                      if (cell.date) {
                        setHover({ date: cell.date, count: cell.count });
                        if (tooltipRef.current) {
                          tooltipRef.current.style.left = `${e.clientX}px`;
                          tooltipRef.current.style.top = `${e.clientY - 8}px`;
                        }
                        playPianoNote(cell.count, audioCtxRef);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (tooltipRef.current) {
                        tooltipRef.current.style.left = `${e.clientX}px`;
                        tooltipRef.current.style.top = `${e.clientY - 8}px`;
                      }
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>less</span>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/50" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-300/70 dark:bg-indigo-900/80" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-400 dark:bg-indigo-700" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-600 dark:bg-indigo-300" />
        <span>more</span>
      </div>

      {/* Cursor-following tooltip rendered in a portal — zero layout impact. */}
      {mounted && hover && createPortal(
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 text-white px-2.5 py-1.5 shadow-xl border border-zinc-700 whitespace-nowrap"
        >
          <div className="text-xs font-bold leading-tight">
            {hover.count} submission{hover.count === 1 ? "" : "s"}
          </div>
          <div className="text-[10px] text-zinc-400 leading-tight">
            {prettyDate(hover.date)}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
