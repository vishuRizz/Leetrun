"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  Award,
  CircleDollarSign,
  Code2,
  Flame,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users as UsersIcon,
} from "lucide-react";

interface AnalyticsResponse {
  user: {
    fullName: string | null;
    plan: string;
    targetCompany: string | null;
    memberSince: string;
  };
  leetcode: {
    connected: boolean;
    username: string | null;
    totalSolved: number;
    easy: number;
    medium: number;
    hard: number;
    acceptanceRate: number | null;
    ranking: number | null;
    contestRating: number | null;
    syncedAt: string | null;
    languages: { language: string; solved: number }[];
  };
  progression: {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    coins: number;
    currentStreak: number;
    longestStreak: number;
  };
  topics: {
    strong: { topic: string; mastery: number; solved: number; attempts: number }[];
    weak: { topic: string; mastery: number; confidence: number }[];
  };
  quests: {
    completedByType: Record<string, number>;
    xpFromQuests: number;
  };
  social: {
    friends: number;
    badges: number;
  };
  activity: {
    heatmap: { date: string; count: number }[];
    activeDays: number;
    totalRecentSubmissions: number;
  };
  recentXp: { amount: number; reason: string; at: string }[];
}

interface SidebarAnalyticsProps {
  /** Only fetch and render once the sidebar has actually expanded. */
  visible: boolean;
}

const CACHE_KEY = "analytics:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(): AnalyticsResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: AnalyticsResponse) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function compact(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function SidebarAnalytics({ visible }: SidebarAnalyticsProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(() => readCache());
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(!!data);

  useEffect(() => {
    if (!visible || hasFetched.current) return;
    hasFetched.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics", { cache: "default" });
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = (await res.json()) as AnalyticsResponse;
        if (cancelled) return;
        setData(json);
        writeCache(json);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (loading && !data) {
    return (
      <div className="px-3 py-4 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
        <div className="h-16 bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-24 bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-20 bg-muted/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {error || "No analytics yet."}
      </div>
    );
  }

  const lc = data.leetcode;
  const totalDiff = Math.max(lc.easy + lc.medium + lc.hard, 1);
  const easyPct = (lc.easy / totalDiff) * 100;
  const mediumPct = (lc.medium / totalDiff) * 100;
  const hardPct = (lc.hard / totalDiff) * 100;

  const totalQuests =
    (data.quests.completedByType.DAILY || 0) +
    (data.quests.completedByType.WEEKLY || 0) +
    (data.quests.completedByType.REVISION || 0) +
    (data.quests.completedByType.FRIEND || 0);

  const maxLangSolved = Math.max(
    ...data.leetcode.languages.map((l) => l.solved),
    1
  );

  // Map heatmap to a 7-row (day-of-week) x 12-col (weeks) grid, oldest first.
  const heatmapGrid: { date: string; count: number }[][] = [];
  const cells = data.activity.heatmap;
  // pad start so that first cell aligns to its day-of-week column
  if (cells.length > 0) {
    const firstDay = new Date(cells[0].date).getDay();
    const padded = [
      ...Array(firstDay).fill({ date: "", count: -1 }),
      ...cells,
    ];
    for (let i = 0; i < padded.length; i += 7) {
      heatmapGrid.push(padded.slice(i, i + 7));
    }
  }

  const heatColor = (count: number) => {
    if (count < 0) return "bg-transparent";
    if (count === 0) return "bg-muted/50";
    if (count < 2) return "bg-indigo-300/70 dark:bg-indigo-900/80";
    if (count < 4) return "bg-indigo-400 dark:bg-indigo-700";
    if (count < 7) return "bg-indigo-500 dark:bg-indigo-500";
    return "bg-indigo-600 dark:bg-indigo-300";
  };

  return (
    <div className="px-3 pb-4 pt-2 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="font-heading text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          Analytics
        </span>
        {data.user.plan === "PREMIUM" && (
          <span className="text-[9px] font-black uppercase bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-1.5 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </div>

      {/* Level + XP progress */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-card to-card border border-indigo-500/20 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">
              Level {data.progression.level}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {data.progression.xpIntoLevel}/100 XP
          </span>
        </div>
        <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${data.progression.xpIntoLevel}%` }}
          />
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground font-mono">
          Total: {compact(data.progression.totalXp)} XP
        </div>
      </div>

      {/* Quick stat row */}
      <div className="grid grid-cols-2 gap-2">
        <StatPill
          icon={<Flame className="w-3 h-3" />}
          label="Streak"
          value={`${data.progression.currentStreak}d`}
          sub={`Best ${data.progression.longestStreak}d`}
          color="text-orange-500"
        />
        <StatPill
          icon={<CircleDollarSign className="w-3 h-3" />}
          label="Coins"
          value={compact(data.progression.coins)}
          sub="Wallet"
          color="text-yellow-500"
        />
        <StatPill
          icon={<Trophy className="w-3 h-3" />}
          label="Badges"
          value={String(data.social.badges)}
          sub="Unlocked"
          color="text-amber-500"
        />
        <StatPill
          icon={<UsersIcon className="w-3 h-3" />}
          label="Friends"
          value={String(data.social.friends)}
          sub="Connected"
          color="text-sky-500"
        />
      </div>

      {/* LeetCode card */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">LeetCode</span>
          </div>
          {lc.connected ? (
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
              @{lc.username}
            </span>
          ) : (
            <span className="text-[9px] text-muted-foreground">Not linked</span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-bold text-foreground">
            {compact(lc.totalSolved)}
          </span>
          <span className="text-[10px] text-muted-foreground">solved</span>
        </div>

        {/* Stacked difficulty bar */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full overflow-hidden flex bg-muted/50">
            <div
              className="bg-emerald-500"
              style={{ width: `${easyPct}%` }}
              title={`Easy ${lc.easy}`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${mediumPct}%` }}
              title={`Medium ${lc.medium}`}
            />
            <div
              className="bg-rose-500"
              style={{ width: `${hardPct}%` }}
              title={`Hard ${lc.hard}`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-emerald-600 dark:text-emerald-400">
              E {lc.easy}
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              M {lc.medium}
            </span>
            <span className="text-rose-600 dark:text-rose-400">H {lc.hard}</span>
          </div>
        </div>

        {/* Secondary LeetCode stats */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <MiniStat
            label="Accept"
            value={
              lc.acceptanceRate != null
                ? `${Math.round(lc.acceptanceRate)}%`
                : "—"
            }
          />
          <MiniStat label="Rating" value={compact(lc.contestRating ?? null)} />
          <MiniStat label="Rank" value={compact(lc.ranking ?? null)} />
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">
              Last 12 weeks
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            {data.activity.activeDays}d active
          </span>
        </div>

        <div className="flex gap-[3px]">
          {heatmapGrid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`w-2.5 h-2.5 rounded-[2px] ${heatColor(cell.count)}`}
                  title={
                    cell.date
                      ? `${cell.date}: ${cell.count} submission${
                          cell.count === 1 ? "" : "s"
                        }`
                      : ""
                  }
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
          <span>{data.activity.totalRecentSubmissions} subs</span>
          <div className="flex items-center gap-1">
            <span>less</span>
            <div className="w-2 h-2 rounded-[2px] bg-muted/50" />
            <div className="w-2 h-2 rounded-[2px] bg-indigo-300/70 dark:bg-indigo-900/80" />
            <div className="w-2 h-2 rounded-[2px] bg-indigo-400 dark:bg-indigo-700" />
            <div className="w-2 h-2 rounded-[2px] bg-indigo-500" />
            <div className="w-2 h-2 rounded-[2px] bg-indigo-600 dark:bg-indigo-300" />
            <span>more</span>
          </div>
        </div>
      </div>

      {/* Top languages */}
      {data.leetcode.languages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">
              Top languages
            </span>
          </div>
          <div className="space-y-1.5">
            {data.leetcode.languages.slice(0, 4).map((l) => (
              <div key={l.language} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-medium">
                  <span className="text-foreground truncate">{l.language}</span>
                  <span className="font-mono text-muted-foreground">
                    {l.solved}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    style={{
                      width: `${Math.max(
                        4,
                        (l.solved / maxLangSolved) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic mastery */}
      {data.topics.strong.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">
              Topic mastery
            </span>
          </div>
          <div className="space-y-1.5">
            {data.topics.strong.map((t) => (
              <div key={t.topic} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-foreground font-medium truncate">
                    {t.topic}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {t.mastery}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.mastery}%`,
                      background:
                        t.mastery > 70
                          ? "linear-gradient(90deg,#10b981,#22c55e)"
                          : t.mastery > 40
                          ? "linear-gradient(90deg,#f59e0b,#eab308)"
                          : "linear-gradient(90deg,#ef4444,#f43f5e)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {data.topics.weak.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/60 space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold font-heading">
                Needs work
              </span>
              <div className="flex flex-wrap gap-1">
                {data.topics.weak.map((t) => (
                  <span
                    key={t.topic}
                    className="text-[9px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full px-2 py-0.5"
                  >
                    {t.topic} · {t.mastery}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quests completed */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">Quests</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            {totalQuests} done
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <QuestPill
            label="Daily"
            value={data.quests.completedByType.DAILY || 0}
            color="text-indigo-500"
          />
          <QuestPill
            label="Weekly"
            value={data.quests.completedByType.WEEKLY || 0}
            color="text-violet-500"
          />
          <QuestPill
            label="Revise"
            value={data.quests.completedByType.REVISION || 0}
            color="text-emerald-500"
          />
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          +{compact(data.quests.xpFromQuests)} XP earned
        </div>
      </div>

      {/* Recent XP */}
      {data.recentXp.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-foreground">
              Recent XP
            </span>
          </div>
          <div className="space-y-1">
            {data.recentXp.slice(0, 4).map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[10px] gap-2"
              >
                <span className="text-muted-foreground truncate flex-1">
                  {log.reason}
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  +{log.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1.5">
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-sm font-heading font-bold text-foreground mt-0.5">
        {value}
      </div>
      <div className="text-[9px] text-muted-foreground font-mono">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-md px-1.5 py-1 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </div>
      <div className="text-[11px] font-mono font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

function QuestPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-muted/30 rounded-md px-1.5 py-1 text-center">
      <div className={`text-base font-heading font-bold ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}
