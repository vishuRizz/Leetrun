"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Award,
  CircleDollarSign,
  TrendingUp,
  Brain,
  ShieldCheck,
  RotateCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { InviteFriendModal } from "@/components/InviteFriendModal";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChallengeProblem {
  id: string;
  problemName: string;
  problemSlug: string;
  difficulty: string;
  topic: string;
}

interface ChallengeData {
  title: string;
  difficulty: string;
  xpReward: number;
  description: string;
  problems: ChallengeProblem[];
}

interface DashboardData {
  user: {
    fullName: string;
    level: string;
    currentStreak: number;
    totalXp: number;
    coins: number;
    targetCompany: string;
    plan: string;
  };
  mentor: { name: string };
  daily: ChallengeData;
  weekly: ChallengeData;
  revision: ChallengeData;
  stats: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    weakestTopic: string | null;
    strongestTopic: string | null;
  };
  leetcode?: {
    connected: boolean;
    username: string | null;
    lastSyncedAt: string | null;
  };
}

const CACHE_KEY = "dashboard:v2";
// How long the cached UI is considered "fresh enough" to render instantly
// while we revalidate in the background.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache(): DashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.ts) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data as DashboardData;
  } catch {
    return null;
  }
}

function writeCache(data: DashboardData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // Storage quota / privacy mode — silently ignore
  }
}

function formatChallenge(raw: any): ChallengeData {
  return {
    title: raw?.challenge?.title || "No Active Challenge",
    difficulty: raw?.challenge?.difficulty || "EASY",
    xpReward: raw?.challenge?.xpReward || 30,
    description:
      raw?.challenge?.description || "Your custom generated challenge.",
    problems: (raw?.challenge?.problems || []).map((p: any) => ({
      id: p.id,
      problemName: p.problemName,
      problemSlug: p.problemSlug,
      difficulty: p.difficulty,
      topic: p.topic,
    })),
  };
}

function normaliseResponse(payload: any): DashboardData {
  return {
    user: payload.user,
    mentor: payload.mentor,
    stats: payload.stats,
    daily: formatChallenge(payload.daily),
    weekly: formatChallenge(payload.weekly),
    revision: formatChallenge(payload.revision),
    leetcode: payload.leetcode,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<DashboardData | null>(() => readCache());
  const [loading, setLoading] = useState<boolean>(() => readCache() === null);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "revision">(
    "daily"
  );
  const backgroundSyncRan = useRef(false);

  const loadDashboard = useCallback(
    async (opts: { showLoader?: boolean } = {}) => {
      if (opts.showLoader && !data) setLoading(true);
      try {
        const res = await fetch("/api/dashboard", {
          // Hint to the browser HTTP cache; we also use sessionStorage above.
          cache: "default",
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Dashboard fetch failed");
        const json = await res.json();
        const normalised = normaliseResponse(json);
        setData(normalised);
        writeCache(normalised);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    },
    [router, data]
  );

  const triggerBackgroundSync = useCallback(
    async (force = false) => {
      try {
        const res = await fetch("/api/leetcode/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        if (!res.ok) return;
        // Refresh the dashboard data only if sync actually changed something.
        // Cheapest correct option: re-fetch the aggregated endpoint.
        await loadDashboard();
      } catch (err) {
        console.error("Background sync failed:", err);
      }
    },
    [loadDashboard]
  );

  // Initial load: render fast (cache or fresh DB-only data), then sync in background.
  useEffect(() => {
    const authThenLoad = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      await loadDashboard({ showLoader: data === null });

      if (!backgroundSyncRan.current) {
        backgroundSyncRan.current = true;
        // Fire-and-forget. Server-side cooldown ensures we don't hammer LeetCode.
        void triggerBackgroundSync(false);
      }
    };
    void authThenLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await triggerBackgroundSync(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpgradePlan = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) await loadDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // First-visit skeleton — drawn instantly, no spinner-only blank screen.
  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (!data) return null;

  const currentChallenge =
    activeTab === "daily"
      ? data.daily
      : activeTab === "weekly"
      ? data.weekly
      : data.revision;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-150">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-black text-xl tracking-wider text-foreground">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-orange-600 dark:text-orange-500 font-bold text-sm">
              <Flame className="w-4 h-4 fill-current" />
              <span>{data.user.currentStreak} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-primary font-bold text-sm">
              <Award className="w-4 h-4" />
              <span>Level {Math.floor(data.user.totalXp / 100) + 1}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-yellow-600 dark:text-yellow-500 font-bold text-sm">
              <CircleDollarSign className="w-4 h-4" />
              <span>{data.user.coins} Coins</span>
            </div>
            {data.user.plan === "PREMIUM" && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1.5 rounded-full text-white font-black text-xs border border-yellow-400/35 shadow-lg shadow-yellow-500/10 animate-pulse">
                PRO
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <InviteFriendModal />
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualSync}
              disabled={syncing}
              title="Sync LeetCode"
            >
              <RotateCw
                className={`w-4 h-4 ${syncing ? "animate-spin text-primary" : ""}`}
              />
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden border-border bg-card">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Brain className="w-40 h-40" />
            </div>

            <CardHeader className="pb-0">
              <div className="flex border-b border-border mb-6 overflow-x-auto gap-2">
                {[
                  {
                    id: "daily",
                    name: "Daily Quest",
                    xp: `+${data.daily.xpReward} XP`,
                  },
                  {
                    id: "weekly",
                    name: "Weekly Quest",
                    xp: `+${data.weekly.xpReward} XP`,
                  },
                  {
                    id: "revision",
                    name: "Revision Shield",
                    xp: `+${data.revision.xpReward} XP`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    type="button"
                    className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.name}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.id
                          ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.xp}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase">
                    {activeTab === "daily"
                      ? "Daily accountability"
                      : activeTab === "weekly"
                      ? "Weekly Elite 5"
                      : "Weakness reinforcement"}
                  </span>
                  <h2 className="text-2xl font-black mt-1">
                    {currentChallenge.title}
                  </h2>
                </div>
                <span className="text-xs bg-muted border border-border px-2.5 py-1 rounded-md text-muted-foreground font-semibold uppercase">
                  {currentChallenge.difficulty}
                </span>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {currentChallenge.description ||
                  "Your custom generated challenge."}
              </p>

              <div className="space-y-4">
                {currentChallenge.problems.map((prob) => (
                  <div
                    key={prob.id}
                    className="flex items-center justify-between p-4 bg-muted/30 border border-border hover:border-indigo-500/40 rounded-xl transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {prob.problemName}
                        </span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          {prob.topic}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Difficulty:{" "}
                        <span className="text-emerald-600 dark:text-emerald-500 font-semibold">
                          {prob.difficulty}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://leetcode.com/problems/${prob.problemSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      Solve <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> Solved problems
                  automatically sync on reload or trigger.
                </span>
                <span className="font-semibold text-primary">
                  +{currentChallenge.xpReward} XP Reward
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Easy Solved
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {data.stats.easySolved}
              </span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Medium Solved
              </span>
              <span className="text-2xl font-black text-yellow-600 dark:text-yellow-500 mt-2">
                {data.stats.mediumSolved}
              </span>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Hard Solved
              </span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-500 mt-2">
                {data.stats.hardSolved}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-card border border-border hover:border-indigo-500/40 rounded-2xl p-6 transition">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
                {data.mentor.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  {data.mentor.name}
                </h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Your AI Mentor
                </span>
              </div>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-foreground leading-relaxed mb-4 relative">
              &quot;Congratulations on finishing your profile onboarding. Today
              we will start with simple Arrays and Strings Warm-up quests. Make
              sure you don&apos;t break your streak on day one!&quot;
            </div>

            <button
              onClick={() => router.push("/chat")}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <MessageSquare className="w-4 h-4" /> Chat with {data.mentor.name}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />{" "}
              Focus Intelligence
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                <span className="text-muted-foreground">Target Company</span>
                <span className="font-bold text-foreground">
                  {data.user.targetCompany}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                <span className="text-muted-foreground">Weak Topic</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {data.stats.weakestTopic || "None detected"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Strongest Topic</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {data.stats.strongestTopic || "None detected"}
                </span>
              </div>
            </div>
          </div>

          {data.user.plan === "FREE" && (
            <div className="bg-gradient-to-r from-indigo-50 via-background to-background dark:from-indigo-950/40 dark:via-indigo-900/10 dark:to-card border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-6 space-y-4">
              <div>
                <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-extrabold uppercase tracking-wider bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-500/20 px-2 py-0.5 rounded">
                  UNLOCK ADVANCED
                </span>
                <h3 className="font-extrabold text-md mt-1.5 text-foreground font-sans">
                  Upgrade to LeetRun Premium
                </h3>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                  Gain access to the full placement suite, unlock premium
                  dashboard analytics, and priority mentor advice.
                </p>
              </div>

              <button
                onClick={handleUpgradePlan}
                disabled={actionLoading}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Upgrade to Premium ($0.20/mo)"
                )}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-32 bg-muted/60 rounded animate-pulse" />
        <div className="hidden md:flex items-center gap-3">
          <div className="h-8 w-24 bg-muted/60 rounded-full animate-pulse" />
          <div className="h-8 w-20 bg-muted/60 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted/60 rounded-full animate-pulse" />
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="border border-border rounded-2xl p-6 bg-card">
            <div className="flex gap-3 mb-6">
              <div className="h-6 w-28 bg-muted/60 rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted/60 rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="h-8 w-2/3 bg-muted/60 rounded mb-3 animate-pulse" />
            <div className="h-4 w-full bg-muted/60 rounded mb-6 animate-pulse" />
            <div className="space-y-3">
              <div className="h-16 w-full bg-muted/40 rounded-xl animate-pulse" />
              <div className="h-16 w-full bg-muted/40 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-card border border-border rounded-xl animate-pulse" />
            <div className="h-24 bg-card border border-border rounded-xl animate-pulse" />
            <div className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          </div>
        </section>
        <section className="space-y-6">
          <div className="h-56 bg-card border border-border rounded-2xl animate-pulse" />
          <div className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
        </section>
      </main>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
