"use client";

import React, { useEffect, useState } from "react";
import { Timer, Zap } from "lucide-react";

interface SpeedData {
  total: number;
  byDifficulty: { difficulty: string; avgSeconds: number; count: number }[];
  fastest: { title: string | null; seconds: number } | null;
  recent: {
    title: string | null;
    difficulty: string | null;
    seconds: number;
    confidence: string | null;
    createdAt: string;
  }[];
}

const DIFF_ORDER = ["easy", "medium", "hard", "unknown"];
const DIFF_COLOR: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
  unknown: "text-muted-foreground",
};

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function SpeedAnalyticsCard() {
  const [data, setData] = useState<SpeedData | null>(null);

  useEffect(() => {
    fetch("/api/solve-attempts")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setData(j))
      .catch(() => {});
  }, []);

  if (!data || data.total === 0) return null;

  const sorted = [...data.byDifficulty].sort(
    (a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty)
  );

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-sky-500" />
        <h2 className="font-bold text-sm">Solve speed</h2>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {data.total} timed {data.total === 1 ? "attempt" : "attempts"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map((d) => (
          <div
            key={d.difficulty}
            className="rounded-xl border border-border bg-muted/30 p-3"
          >
            <div
              className={`text-[10px] font-black uppercase tracking-widest ${
                DIFF_COLOR[d.difficulty] || ""
              }`}
            >
              {d.difficulty}
            </div>
            <div className="text-lg font-black mt-0.5">{fmt(d.avgSeconds)}</div>
            <div className="text-[10px] text-muted-foreground">
              avg · {d.count} solved
            </div>
          </div>
        ))}
      </div>

      {data.fastest?.title && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">Fastest:</span>
          <span className="font-bold truncate">{data.fastest.title}</span>
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 ml-auto shrink-0">
            {fmt(data.fastest.seconds)}
          </span>
        </div>
      )}
    </section>
  );
}
