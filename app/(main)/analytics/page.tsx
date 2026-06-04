"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Award,
  BarChart3,
  CircleDollarSign,
  Code2,
  ExternalLink,
  Flame,
  Layers,
  Lightbulb,
  RotateCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users as UsersIcon,
} from "lucide-react";
import { useGuest } from "@/components/GuestProvider";
import { SAMPLE_ANALYTICS } from "@/lib/guest/sample-data";
import { readCache, writeCache } from "@/lib/cache/clientCache";
import ProblemNoteButton from "@/components/ProblemNoteButton";

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
  recommendations?: {
    topic: string;
    problems: {
      title: string;
      slug: string;
      difficulty: "easy" | "medium" | "hard";
      sheetSlug: string;
      sheetName: string;
    }[];
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

const CACHE_KEY = "analytics:v1";

function compact(n: number | null | undefined) {
  if (n == null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelative(iso: string | null) {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

export default function AnalyticsPage() {
  const { promptSignup } = useGuest();
  const [guest, setGuest] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(() =>
    readCache<AnalyticsResponse>(CACHE_KEY)
  );
  const [loading, setLoading] = useState<boolean>(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      try {
        const res = await fetch("/api/analytics", {
          cache: force ? "no-store" : "default",
        });
        if (res.status === 401) {
          // Guest preview: render full analytics structure with dummy data.
          setGuest(true);
          setData(SAMPLE_ANALYTICS as unknown as AnalyticsResponse);
          setError(null);
          promptSignup("full analytics");
          return;
        }
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = (await res.json()) as AnalyticsResponse;
        setData(json);
        writeCache(CACHE_KEY, json);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [promptSignup]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading && !data) {
    return <AnalyticsSkeleton />;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground text-sm">
        {error || "No analytics yet."}
      </div>
    );
  }

  const lc = data.leetcode;
  const totalDiff = Math.max(lc.easy + lc.medium + lc.hard, 1);
  const easyPct = (lc.easy / totalDiff) * 100;
  const mediumPct = (lc.medium / totalDiff) * 100;
  const hardPct = (lc.hard / totalDiff) * 100;
  const maxLangSolved = Math.max(...lc.languages.map((l) => l.solved), 1);

  const totalQuests =
    (data.quests.completedByType.DAILY || 0) +
    (data.quests.completedByType.WEEKLY || 0) +
    (data.quests.completedByType.REVISION || 0) +
    (data.quests.completedByType.FRIEND || 0);

  // Build week-column heatmap from the daily series.
  const heatmapGrid: { date: string; count: number }[][] = [];
  const cells = data.activity.heatmap;
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h1 className="font-heading font-black text-xl tracking-tight">
            Analytics
          </h1>
          {data.user.plan === "PREMIUM" && (
            <span className="text-[9px] font-black uppercase bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-2 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden sm:inline font-mono">
            LeetCode synced {formatRelative(lc.syncedAt)}
          </span>
          <button
            onClick={() => (guest ? promptSignup("live analytics") : load(true))}
            disabled={refreshing}
            className="p-2 rounded-lg border border-border hover:bg-muted text-foreground transition"
            title="Refresh"
          >
            <RotateCw
              className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-500" : ""}`}
            />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Code2 className="w-4 h-4" />}
            label="Total solved"
            value={compact(lc.totalSolved)}
            sub={lc.connected && lc.username ? `@${lc.username}` : "Not linked"}
            tint="text-indigo-500"
          />
          <KpiCard
            icon={<Sparkles className="w-4 h-4" />}
            label="Level"
            value={String(data.progression.level)}
            sub={`${data.progression.xpIntoLevel}/100 to next`}
            tint="text-violet-500"
          />
          <KpiCard
            icon={<Flame className="w-4 h-4" />}
            label="Streak"
            value={`${data.progression.currentStreak}d`}
            sub={`Best ${data.progression.longestStreak}d`}
            tint="text-orange-500"
          />
          <KpiCard
            icon={<CircleDollarSign className="w-4 h-4" />}
            label="Coins"
            value={compact(data.progression.coins)}
            sub={`${compact(data.progression.totalXp)} XP total`}
            tint="text-yellow-500"
          />
        </div>

        {/* LeetCode + Activity heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LeetCode card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                <h2 className="font-heading font-bold text-lg">LeetCode</h2>
              </div>
              {lc.connected ? (
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  @{lc.username}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not linked yet</span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-heading text-5xl font-black">
                {compact(lc.totalSolved)}
              </span>
              <span className="text-sm text-muted-foreground">problems solved</span>
            </div>

            {/* Difficulty stacked bar */}
            <div className="space-y-2">
              <div className="h-3 rounded-full overflow-hidden flex bg-muted/50">
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
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <DifficultyChip color="emerald" label="Easy" value={lc.easy} />
                <DifficultyChip color="amber" label="Medium" value={lc.medium} />
                <DifficultyChip color="rose" label="Hard" value={lc.hard} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <MetricBox
                label="Acceptance"
                value={
                  lc.acceptanceRate != null
                    ? `${Math.round(lc.acceptanceRate)}%`
                    : "-"
                }
              />
              <MetricBox
                label="Contest rating"
                value={compact(lc.contestRating ?? null)}
              />
              <MetricBox
                label="Global rank"
                value={compact(lc.ranking ?? null)}
              />
            </div>
          </div>

          {/* Activity heatmap */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <h2 className="font-heading font-bold text-lg">Activity</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {data.activity.activeDays}d active
              </span>
            </div>

            <div className="flex gap-1">
              {heatmapGrid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className={`w-3 h-3 rounded-[3px] ${heatColor(cell.count)}`}
                      title={
                        cell.date
                          ? `${cell.date}: ${cell.count} submission${cell.count === 1 ? "" : "s"}`
                          : ""
                      }
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{data.activity.totalRecentSubmissions} subs (12wk)</span>
              <div className="flex items-center gap-1">
                <span>less</span>
                <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/50" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-300/70 dark:bg-indigo-900/80" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-400 dark:bg-indigo-700" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500" />
                <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-600 dark:bg-indigo-300" />
                <span>more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Languages + Topic mastery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top languages */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <h2 className="font-heading font-bold text-lg">Languages</h2>
            </div>
            {lc.languages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sync your LeetCode profile to see language stats.
              </p>
            ) : (
              <div className="space-y-3">
                {lc.languages.slice(0, 6).map((l) => (
                  <div key={l.language} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{l.language}</span>
                      <span className="font-mono text-muted-foreground">
                        {l.solved}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        style={{ width: `${Math.max(4, (l.solved / maxLangSolved) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topic mastery */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <h2 className="font-heading font-bold text-lg">Topic mastery</h2>
            </div>

            {data.topics.strong.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Topic data appears after your first sync.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {data.topics.strong.map((t) => (
                  <MasteryRow key={t.topic} {...t} />
                ))}
              </div>
            )}

            {data.topics.weak.length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <span className="text-[10px] uppercase tracking-widest text-rose-500 font-black font-heading">
                  Needs work
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.topics.weak.map((t) => (
                    <span
                      key={t.topic}
                      className="text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full px-2 py-1"
                    >
                      {t.topic} · {t.mastery}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended problems for the weakest topic */}
        {data.recommendations && data.recommendations.problems.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-500" />
                <h2 className="font-heading font-bold text-lg">
                  Recommended for you
                </h2>
              </div>
              <Link
                href="/sheets"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Browse all sheets
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;re lighter on{" "}
              <span className="font-bold text-foreground">
                {data.recommendations.topic}
              </span>
              . Knock out these {data.recommendations.problems.length} hand-picked
              problems to level it up.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.recommendations.problems.map((p) => (
                <div
                  key={p.slug}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:border-indigo-500/40 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          p.difficulty === "hard"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : p.difficulty === "medium"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                      <span className="font-semibold text-sm truncate">
                        {p.title}
                      </span>
                    </div>
                    <Link
                      href={`/sheets/${p.sheetSlug}`}
                      className="text-[11px] text-muted-foreground hover:text-indigo-500 transition"
                    >
                      from {p.sheetName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ProblemNoteButton problemRef={p.slug.toLowerCase()} title={p.title} />
                    <a
                      href={`https://leetcode.com/problems/${p.slug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Solve <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quests + Recent XP + Social */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <h2 className="font-heading font-bold text-lg">Quests</h2>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {totalQuests} done
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <QuestStat
                label="Daily"
                value={data.quests.completedByType.DAILY || 0}
                color="text-indigo-500"
              />
              <QuestStat
                label="Weekly"
                value={data.quests.completedByType.WEEKLY || 0}
                color="text-violet-500"
              />
              <QuestStat
                label="Revise"
                value={data.quests.completedByType.REVISION || 0}
                color="text-emerald-500"
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono pt-1">
              +{compact(data.quests.xpFromQuests)} XP earned from quests
            </div>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                <h2 className="font-heading font-bold text-lg">Recent XP</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  {data.social.badges} badges
                </span>
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5 text-sky-500" />
                  {data.social.friends} friends
                </span>
              </div>
            </div>
            {data.recentXp.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Solve a quest to start earning XP.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.recentXp.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-foreground truncate">{log.reason}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      +{log.amount} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tint: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={`flex items-center gap-1.5 ${tint}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-bold">
          {label}
        </span>
      </div>
      <div className="mt-2 font-heading text-3xl font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground font-mono mt-1">{sub}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div className="text-base font-mono font-bold mt-1">{value}</div>
    </div>
  );
}

function DifficultyChip({
  color,
  label,
  value,
}: {
  color: "emerald" | "amber" | "rose";
  label: string;
  value: number;
}) {
  const map = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return (
    <div className={`rounded-lg border px-3 py-1.5 font-mono flex items-center justify-between ${map[color]}`}>
      <span className="font-bold">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MasteryRow({
  topic,
  mastery,
  solved,
}: {
  topic: string;
  mastery: number;
  solved: number;
  attempts: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium truncate">{topic}</span>
        <span className="font-mono text-muted-foreground">
          {solved} solved
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${mastery}%`,
            background:
              mastery > 70
                ? "linear-gradient(90deg,#10b981,#22c55e)"
                : mastery > 40
                ? "linear-gradient(90deg,#f59e0b,#eab308)"
                : "linear-gradient(90deg,#ef4444,#f43f5e)",
          }}
        />
      </div>
    </div>
  );
}

function QuestStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-3 text-center">
      <div className={`font-heading text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">
        {label}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border px-6 py-4">
        <div className="h-6 w-32 bg-muted/60 rounded animate-pulse" />
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-card border border-border rounded-2xl animate-pulse" />
          <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-56 bg-card border border-border rounded-2xl animate-pulse" />
          <div className="lg:col-span-2 h-56 bg-card border border-border rounded-2xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}
