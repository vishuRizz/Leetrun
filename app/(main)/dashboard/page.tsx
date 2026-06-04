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
  Check,
  BadgeCheck,
  CheckCircle2,
  Dices,
} from "lucide-react";
import { InviteFriendModal } from "@/components/InviteFriendModal";
import ContinueReadingCard from "@/components/notes/ContinueReadingCard";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RevisionPanel from "./RevisionPanel";
import { useGuest } from "@/components/GuestProvider";
import { SAMPLE_DASHBOARD } from "@/lib/guest/sample-data";
import { readCache, writeCache } from "@/lib/cache/clientCache";

interface ChallengeProblem {
  id: string;
  problemName: string;
  problemSlug: string;
  difficulty: string;
  topic: string;
  completed: boolean;
  verified: boolean;
}

interface ChallengeData {
  userChallengeId: string | null;
  status: string;
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
  revision: ChallengeData | null;
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

function formatChallenge(raw: any): ChallengeData {
  const progressById = new Map<string, { completed: boolean; verified: boolean }>();
  (raw?.problemProgress || []).forEach((pp: any) => {
    progressById.set(pp.problemId, {
      completed: !!pp.completed,
      verified: !!pp.verified,
    });
  });

  return {
    userChallengeId: raw?.id || null,
    status: raw?.status || "ACTIVE",
    title: raw?.challenge?.title || "No Active Challenge",
    difficulty: raw?.challenge?.difficulty || "EASY",
    xpReward: raw?.challenge?.xpReward || 30,
    description:
      raw?.challenge?.description || "Your custom generated challenge.",
    problems: (raw?.challenge?.problems || []).map((p: any) => {
      const prog = progressById.get(p.id);
      return {
        id: p.id,
        problemName: p.problemName,
        problemSlug: p.problemSlug,
        difficulty: p.difficulty,
        topic: p.topic,
        completed: prog?.completed ?? false,
        verified: prog?.verified ?? false,
      };
    }),
  };
}

function normaliseResponse(payload: any): DashboardData {
  return {
    user: payload.user,
    mentor: payload.mentor,
    stats: payload.stats,
    daily: formatChallenge(payload.daily),
    weekly: formatChallenge(payload.weekly),
    revision: payload.revision ? formatChallenge(payload.revision) : null,
    leetcode: payload.leetcode,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { promptSignup } = useGuest();
  const [guest, setGuest] = useState(false);
  const [data, setData] = useState<DashboardData | null>(() =>
    readCache<DashboardData>(CACHE_KEY)
  );
  const [loading, setLoading] = useState<boolean>(
    () => readCache<DashboardData>(CACHE_KEY) === null
  );
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "revision">(
    "daily"
  );
  const [verifyingQuest, setVerifyingQuest] = useState(false);
  const [togglingProblem, setTogglingProblem] = useState<string | null>(null);
  const [showRevisionConfig, setShowRevisionConfig] = useState(false);
  const [questMessage, setQuestMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);
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
          // Guest preview: show the full dashboard structure with dummy data
          // and nudge them to sign up.
          setGuest(true);
          setData(SAMPLE_DASHBOARD as unknown as DashboardData);
          setLoading(false);
          promptSignup();
          return;
        }
        if (!res.ok) throw new Error("Dashboard fetch failed");
        const json = await res.json();
        const normalised = normaliseResponse(json);
        setData(normalised);
        writeCache(CACHE_KEY, normalised);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    },
    [router, data, promptSignup]
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
        setGuest(true);
        setData(SAMPLE_DASHBOARD as unknown as DashboardData);
        setLoading(false);
        promptSignup();
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
    if (guest) {
      promptSignup("LeetCode sync");
      return;
    }
    setSyncing(true);
    try {
      await triggerBackgroundSync(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleVerifyQuest = async (userChallengeId: string | null) => {
    if (guest) {
      promptSignup("quests");
      return;
    }
    if (!userChallengeId) return;
    setVerifyingQuest(true);
    setQuestMessage(null);
    try {
      // Pull fresh LeetCode solves first so verification is accurate.
      await fetch("/api/leetcode/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }).catch(() => {});

      const res = await fetch("/api/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userChallengeId, action: "verify" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setQuestMessage({ type: "error", text: json.error || "Verify failed." });
        return;
      }
      setQuestMessage({
        type: json.status === "COMPLETED" ? "success" : "info",
        text: json.message,
      });
      await loadDashboard();
    } catch {
      setQuestMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setVerifyingQuest(false);
    }
  };

  const handleToggleProblem = async (
    userChallengeId: string | null,
    problemId: string,
    completed: boolean
  ) => {
    if (guest) {
      promptSignup("quests");
      return;
    }
    if (!userChallengeId) return;
    setTogglingProblem(problemId);
    setQuestMessage(null);
    try {
      const res = await fetch("/api/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userChallengeId,
          action: "toggle",
          problemId,
          completed,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setQuestMessage({ type: "error", text: json.error || "Update failed." });
        return;
      }
      if (json.status === "COMPLETED" && json.xpAwarded > 0) {
        setQuestMessage({
          type: "success",
          text: `Quest complete! +${json.xpAwarded} XP claimed.`,
        });
      }
      await loadDashboard();
    } catch {
      setQuestMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setTogglingProblem(null);
    }
  };

  const handleUpgradePlan = async () => {
    if (guest) {
      promptSignup("Premium");
      return;
    }
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

  // First-visit skeleton - drawn instantly, no spinner-only blank screen.
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

  // The revision tab is fully configurable: show the builder when there's no
  // active revision quest, or when the user explicitly asks for a new one.
  const showRevisionBuilder =
    activeTab === "revision" && (!data.revision || showRevisionConfig);

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
          {!guest && <ContinueReadingCard />}
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
                    done: data.daily.status === "COMPLETED",
                  },
                  {
                    id: "weekly",
                    name: "Weekly Quest",
                    xp: `+${data.weekly.xpReward} XP`,
                    done: data.weekly.status === "COMPLETED",
                  },
                  {
                    id: "revision",
                    name: "Revision",
                    xp: data.revision ? `+${data.revision.xpReward} XP` : "Custom",
                    done: data.revision?.status === "COMPLETED",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setQuestMessage(null);
                    }}
                    type="button"
                    className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.name}
                    {tab.done ? (
                      <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          activeTab === tab.id
                            ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tab.xp}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {showRevisionBuilder ? (
                <div>
                  <div className="mb-6">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase">
                      Custom revision
                    </span>
                    <h2 className="text-2xl font-black mt-1">
                      Spin up a revision question
                    </h2>
                  </div>
                  <RevisionPanel
                    onGenerated={async () => {
                      setShowRevisionConfig(false);
                      setQuestMessage(null);
                      await loadDashboard();
                    }}
                    onCancel={
                      data.revision
                        ? () => setShowRevisionConfig(false)
                        : undefined
                    }
                  />
                </div>
              ) : currentChallenge ? (
                <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase">
                    {activeTab === "daily"
                      ? "Daily accountability"
                      : activeTab === "weekly"
                      ? "Weekly Elite 5"
                      : "Your revision set"}
                  </span>
                  <h2 className="text-2xl font-black mt-1">
                    {currentChallenge.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeTab === "revision" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (guest) {
                          promptSignup("custom revision");
                          return;
                        }
                        setShowRevisionConfig(true);
                        setQuestMessage(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold border border-border hover:border-indigo-500/50 text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md transition"
                      title="Configure a new revision"
                    >
                      <Dices className="w-3.5 h-3.5" /> New
                    </button>
                  )}
                  <span className="text-xs bg-muted border border-border px-2.5 py-1 rounded-md text-muted-foreground font-semibold uppercase">
                    {currentChallenge.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {currentChallenge.description ||
                  "Your custom generated challenge."}
              </p>

              <div className="space-y-4">
                {currentChallenge.problems.map((prob) => {
                  const isCompleted = currentChallenge.status === "COMPLETED";
                  const done = isCompleted || prob.completed;
                  const toggling = togglingProblem === prob.id;
                  return (
                    <div
                      key={prob.id}
                      className={`flex items-center justify-between gap-3 p-4 border rounded-xl transition ${
                        done
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-muted/30 border-border hover:border-indigo-500/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleProblem(
                              currentChallenge.userChallengeId,
                              prob.id,
                              !prob.completed
                            )
                          }
                          disabled={toggling || isCompleted}
                          title={
                            done ? "Mark as not done" : "Mark as done"
                          }
                          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition ${
                            done
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-background border-border hover:border-indigo-500"
                          } ${isCompleted ? "cursor-default" : ""}`}
                        >
                          {toggling ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          ) : done ? (
                            <Check className="w-4 h-4" />
                          ) : null}
                        </button>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-bold ${
                                done
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {prob.problemName}
                            </span>
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                              {prob.topic}
                            </span>
                            {prob.verified && (
                              <span className="text-[10px] inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                <BadgeCheck className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Difficulty:{" "}
                            <span className="text-emerald-600 dark:text-emerald-500 font-semibold">
                              {prob.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`https://leetcode.com/problems/${prob.problemSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm shrink-0"
                      >
                        Solve <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>

              {questMessage && (
                <div
                  className={`mt-4 text-xs font-medium flex items-center gap-1.5 rounded-lg px-3 py-2 ${
                    questMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : questMessage.type === "error"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {questMessage.type === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {questMessage.text}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-6 border-t border-border">
                {currentChallenge.status === "COMPLETED" ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="w-4 h-4" /> Completed, +
                    {currentChallenge.xpReward} XP claimed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      handleVerifyQuest(currentChallenge.userChallengeId)
                    }
                    disabled={verifyingQuest}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    {verifyingQuest ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Verify &amp; Claim XP
                  </button>
                )}
                <span className="text-xs font-semibold text-primary">
                  +{currentChallenge.xpReward} XP Reward
                </span>
              </div>
                </>
              ) : null}
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
