"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Crown,
  Loader2,
  Trophy,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  Sparkles,
  Activity,
  ExternalLink,
} from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  currentStreak: number;
  isHost: boolean;
  xp: number;
  verified: number;
  preSolved: number;
  solved: number;
  lastActivity: string | null;
  rank: number;
}

type ActivityKind = "verified" | "preSolved" | "claimed" | "completed";

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  userId: string;
  userName: string;
  userEmail: string;
  roomChallengeId: string;
  problemTitle: string;
  problemSlug: string | null;
  problemNumber: number | null;
  difficulty: string;
  topic: string | null;
  xpAwarded: number;
  isHostQuestion: boolean;
}

interface DetailResponse {
  success: boolean;
  meta: {
    id: string;
    name: string;
    roomCode: string;
    creatorId: string;
    createdAt: string;
    memberCount: number;
  };
  leaderboard: LeaderboardEntry[];
  activity: ActivityEvent[];
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAbsolute(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind: ActivityKind) {
  switch (kind) {
    case "verified":
      return { text: "Verified on LeetCode", icon: Sparkles, tone: "emerald" };
    case "preSolved":
      return { text: "Marked as solved before joining", icon: ShieldCheck, tone: "sky" };
    case "claimed":
      return { text: "Marked as done (awaiting verify)", icon: CircleDashed, tone: "amber" };
    case "completed":
    default:
      return { text: "Auto-completed via sync", icon: CheckCircle2, tone: "emerald" };
  }
}

const toneClass: Record<string, string> = {
  emerald:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  amber:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
};

const difficultyTone: Record<string, string> = {
  EASY: "text-emerald-500",
  MEDIUM: "text-amber-500",
  HARD: "text-rose-500",
};

export default function LobbyLeaderboardDetailPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy fetch — only runs when the user navigates to this page.
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/room/leaderboard/detail?roomId=${encodeURIComponent(roomId)}`,
          { cache: "no-store" }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load leaderboard.");
        if (active) setData(body);
      } catch (err: any) {
        if (active) setError(err.message || "Network error.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [roomId]);

  const top10 = useMemo(() => data?.leaderboard.slice(0, 10) || [], [data]);
  const maxXp = useMemo(
    () => Math.max(1, ...top10.map((e) => e.xp)),
    [top10]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-rose-500 font-semibold text-sm">{error || "No data."}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-muted hover:bg-muted/70 border border-border rounded-lg text-xs font-bold"
        >
          Go back
        </button>
      </div>
    );
  }

  const { meta, leaderboard, activity } = data;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/rooms?roomId=${meta.id}`}
              className="p-2 rounded-lg bg-muted hover:bg-muted/70 border border-border transition shrink-0"
              title="Back to lobby"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-500">
                Lobby Leaderboard
              </div>
              <h1 className="text-xl sm:text-2xl font-black truncate flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
                {meta.name}
              </h1>
              <p className="text-[10.5px] font-mono text-muted-foreground">
                #{meta.roomCode} · {meta.memberCount} member{meta.memberCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 chart */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-black text-sm flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" /> Top 10 by XP
          </h2>
          {top10.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No one has earned XP in this lobby yet. Solve a question and click Verify to appear here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {top10.map((entry) => {
                const widthPct = Math.max(4, (entry.xp / maxXp) * 100);
                const medal =
                  entry.rank === 1
                    ? "🥇"
                    : entry.rank === 2
                    ? "🥈"
                    : entry.rank === 3
                    ? "🥉"
                    : `#${entry.rank}`;
                return (
                  <div key={entry.userId} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-muted-foreground w-9 text-right shrink-0">
                      {medal}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 text-[11.5px]">
                        <span className="font-semibold text-foreground truncate flex items-center gap-1">
                          {entry.rank === 1 && (
                            <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                          )}
                          {entry.fullName || entry.email.split("@")[0]}
                        </span>
                        <span className="font-mono font-black text-indigo-500 dark:text-indigo-400 shrink-0">
                          {entry.xp} XP
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick stats */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-black text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Lobby pulse
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Members" value={meta.memberCount} />
            <Stat label="Ranked" value={leaderboard.length} />
            <Stat
              label="Total XP"
              value={leaderboard.reduce((acc, e) => acc + e.xp, 0)}
            />
            <Stat
              label="Verified solves"
              value={leaderboard.reduce((acc, e) => acc + e.verified, 0)}
            />
            <Stat
              label="Pre-solved"
              value={leaderboard.reduce((acc, e) => acc + e.preSolved, 0)}
            />
            <Stat label="Activity events" value={activity.length} />
          </div>
        </section>

        {/* Full rankings */}
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-black text-sm mb-4">Full rankings</h2>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rankings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="py-2 pr-2 font-bold">#</th>
                    <th className="py-2 pr-2 font-bold">Member</th>
                    <th className="py-2 pr-2 font-bold text-right">XP</th>
                    <th className="py-2 pr-2 font-bold text-right">✓</th>
                    <th className="py-2 pr-2 font-bold text-right">Pre</th>
                    <th className="py-2 pr-2 font-bold text-right">Done</th>
                    <th className="py-2 pr-2 font-bold text-right hidden sm:table-cell">
                      Last activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const medal =
                      entry.rank === 1
                        ? "🥇"
                        : entry.rank === 2
                        ? "🥈"
                        : entry.rank === 3
                        ? "🥉"
                        : `#${entry.rank}`;
                    return (
                      <tr
                        key={entry.userId}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-2.5 pr-2 font-mono text-muted-foreground">
                          {medal}
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {entry.rank === 1 && (
                              <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                            )}
                            <span className="font-semibold text-foreground truncate">
                              {entry.fullName || entry.email.split("@")[0]}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono font-black text-indigo-500 dark:text-indigo-400">
                          {entry.xp}
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {entry.verified}
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono text-sky-600 dark:text-sky-400">
                          {entry.preSolved}
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono text-muted-foreground">
                          {entry.solved}
                        </td>
                        <td className="py-2.5 pr-2 text-right text-muted-foreground hidden sm:table-cell">
                          {entry.lastActivity
                            ? formatRelative(entry.lastActivity)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Activity timeline */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-black text-sm flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-indigo-400" /> Activity timeline
          </h2>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {activity.map((ev) => {
                const meta = kindLabel(ev.kind);
                const Icon = meta.icon;
                return (
                  <article
                    key={ev.id}
                    className="border border-border rounded-lg p-3 bg-background/40"
                  >
                    <header className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-foreground text-xs truncate">
                        {ev.userName}
                      </span>
                      <span
                        className="text-[9.5px] text-muted-foreground shrink-0"
                        title={formatAbsolute(ev.at)}
                      >
                        {formatRelative(ev.at)}
                      </span>
                    </header>
                    <div
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${toneClass[meta.tone]}`}
                    >
                      <Icon className="w-3 h-3" />
                      {meta.text}
                    </div>
                    <div className="mt-2 text-[11.5px] text-foreground flex items-start gap-1 min-w-0">
                      <span className="font-mono text-muted-foreground shrink-0">
                        {ev.problemNumber ? `#${ev.problemNumber}` : ""}
                      </span>
                      {ev.problemSlug ? (
                        <a
                          href={`https://leetcode.com/problems/${ev.problemSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-foreground hover:text-indigo-500 inline-flex items-center gap-1 truncate"
                        >
                          {ev.problemTitle}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-semibold text-foreground truncate">
                          {ev.problemTitle}
                        </span>
                      )}
                    </div>
                    <footer className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span
                        className={`font-bold uppercase ${difficultyTone[ev.difficulty] || ""}`}
                      >
                        {ev.difficulty}
                      </span>
                      {ev.topic && (
                        <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                          {ev.topic}
                        </span>
                      )}
                      {ev.xpAwarded > 0 && (
                        <span className="font-mono font-bold text-indigo-500">
                          +{ev.xpAwarded} XP
                        </span>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background border border-border rounded-lg p-2.5">
      <div className="text-[9.5px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div className="font-mono font-black text-base text-foreground">{value}</div>
    </div>
  );
}
