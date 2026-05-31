"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Award,
  CircleDollarSign,
  TrendingUp,
  Brain,
  ShieldCheck,
  RotateCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { InviteFriendModal } from "@/components/InviteFriendModal";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ChallengeData {
  title: string;
  difficulty: string;
  xpReward: number;
  description: string;
  problems: Array<{
    id: string;
    problemName: string;
    problemSlug: string;
    difficulty: string;
    topic: string;
  }>;
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
  mentor: {
    name: string;
  };
  challenge: ChallengeData;
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
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "revision">("daily");

  // Sign out helper
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      // 1. Sync Leetcode data
      const syncRes = await fetch("/api/leetcode/sync", { method: "POST" });
      const syncResult = await syncRes.json();
      const profile = syncResult.profile || { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 };

      // 2. Fetch db profile details for plan
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      const dbUser = profileData.profile || {};

      // 3. Fetch active challenge
      const challengeRes = await fetch("/api/challenge/active");
      const challengeResult = await challengeRes.json();
      
      const dailyChallenge = challengeResult.daily;
      const weeklyChallenge = challengeResult.weekly;
      const revisionChallenge = challengeResult.revision;

      const formatChallenge = (uc: any): ChallengeData => ({
        title: uc?.challenge?.title || "No Active Challenge",
        difficulty: uc?.challenge?.difficulty || "EASY",
        xpReward: uc?.challenge?.xpReward || 30,
        description: uc?.challenge?.description || "Your custom generated challenge.",
        problems: (uc?.challenge?.problems || []).map((p: any) => ({
          id: p.id,
          problemName: p.problemName,
          problemSlug: p.problemSlug,
          difficulty: p.difficulty,
          topic: p.topic,
        })),
      });

      setData({
        user: {
          fullName: authUser.user_metadata?.full_name || dbUser.fullName || "Code Runner",
          level: profile.totalSolved >= 300 ? "ADVANCED" : profile.totalSolved >= 100 ? "INTERMEDIATE" : "BEGINNER",
          currentStreak: dbUser.currentStreak || 1,
          totalXp: dbUser.totalXp || (profile.totalSolved * 20 + 50),
          coins: dbUser.coins || (profile.totalSolved * 5),
          targetCompany: dbUser.targetCompany || "Google",
          plan: dbUser.plan || "FREE",
        },
        mentor: {
          name: dbUser.aiCompanion?.name || authUser.user_metadata?.mentorName || "Sensei",
        },
        challenge: formatChallenge(dailyChallenge),
        daily: formatChallenge(dailyChallenge),
        weekly: formatChallenge(weeklyChallenge),
        revision: formatChallenge(revisionChallenge),
        stats: {
          totalSolved: profile.totalSolved || 0,
          easySolved: profile.easySolved || 0,
          mediumSolved: profile.mediumSolved || 0,
          hardSolved: profile.hardSolved || 0,
          weakestTopic: dbUser.stats?.weakestTopic || "DP",
          strongestTopic: dbUser.stats?.strongestTopic || "Arrays",
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
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
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-slate-400 text-sm">Loading your command center...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex flex-col transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent mr-4">
            CODERUN
          </span>
          <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <button onClick={() => router.push("/leaderboard")} className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer">Leaderboard</button>
            <button onClick={() => router.push("/rooms")} className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer">Lobbies</button>
            <button onClick={() => router.push("/profile")} className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer">Profile</button>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-orange-600 dark:text-orange-500 font-bold text-sm">
            <Flame className="w-4 h-4 fill-current" />
            <span>{data.user.currentStreak} Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-full text-primary font-bold text-sm">
            <Award className="w-4 h-4" />
            <span>Level {Math.floor(data.user.totalXp / 100) + 1}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full text-yellow-600 dark:text-yellow-500 font-bold text-sm shadow-sm dark:shadow-none">
            <CircleDollarSign className="w-4 h-4" />
            <span>{data.user.coins} Coins</span>
          </div>
          {data.user.plan === "PREMIUM" && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1.5 rounded-full text-slate-950 font-black text-xs border border-yellow-400/35 shadow-lg shadow-yellow-500/10 animate-pulse">
              PRO
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <InviteFriendModal />
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            title="Sync LeetCode"
          >
            <RotateCw className={`w-4 h-4 ${syncing ? "animate-spin text-primary" : ""}`} />
          </Button>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Challenges */}
        <section className="lg:col-span-2 space-y-6">
          <Card className="relative overflow-hidden border-border bg-card">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Brain className="w-40 h-40" />
            </div>
            
            <CardHeader className="pb-0">

            {/* Dynamic Tabs */}
            <div className="flex border-b border-slate-800/80 mb-6 overflow-x-auto gap-2">
              {[
                { id: "daily", name: "Daily Quest", xp: `+${data.daily.xpReward} XP` },
                { id: "weekly", name: "Weekly Quest", xp: `+${data.weekly.xpReward} XP` },
                { id: "revision", name: "Revision Shield", xp: `+${data.revision.xpReward} XP` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  type="button"
                  className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.name}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? "bg-indigo-600/20 text-indigo-300" : "bg-slate-800 text-slate-500"
                  }`}>
                    {tab.xp}
                  </span>
                </button>
              ))}
            </div>
            </CardHeader>

            {(() => {
              const currentChallenge = activeTab === "daily" ? data.daily : activeTab === "weekly" ? data.weekly : data.revision;
              return (
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs text-indigo-400 font-bold tracking-wider uppercase">
                        {activeTab === "daily" ? "Daily accountability" : activeTab === "weekly" ? "Weekly Elite 5" : "Weakness reinforcement"}
                      </span>
                      <h2 className="text-2xl font-black mt-1">{currentChallenge.title}</h2>
                    </div>
                    <span className="text-xs bg-slate-800 border border-slate-750 px-2.5 py-1 rounded-md text-slate-300 font-semibold uppercase">
                      {currentChallenge.difficulty}
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    {currentChallenge.description || "Your custom generated challenge."}
                  </p>

                  <div className="space-y-4">
                    {currentChallenge.problems.map((prob) => (
                      <div
                        key={prob.id}
                        className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-750 rounded-xl transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-850 dark:text-slate-100">{prob.problemName}</span>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                              {prob.topic}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Difficulty: <span className="text-emerald-600 dark:text-emerald-500 font-semibold">{prob.difficulty}</span>
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
                      <ShieldCheck className="w-4 h-4" /> Solved problems automatically sync on reload or trigger.
                    </span>
                    <span className="font-semibold text-primary">+{currentChallenge.xpReward} XP Reward</span>
                  </div>
                </CardContent>
              );
            })()}
          </Card>

          {/* Quick stats details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Easy Solved</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{data.stats.easySolved}</span>
            </div>
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Medium Solved</span>
              <span className="text-2xl font-black text-yellow-600 dark:text-yellow-500 mt-2">{data.stats.mediumSolved}</span>
            </div>
            <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between shadow-sm dark:shadow-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hard Solved</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-500 mt-2">{data.stats.hardSolved}</span>
            </div>
          </div>
        </section>

        {/* Right Column: AI Mentor Vibe & Social */}
        <section className="space-y-6">
          {/* AI Mentor Card */}
          <div className="bg-white dark:bg-gradient-to-b dark:from-indigo-950/30 dark:to-slate-900/40 border border-slate-200 dark:border-indigo-900/20 hover:border-slate-300 dark:hover:border-indigo-900/40 rounded-2xl p-6 transition shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
                {data.mentor.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{data.mentor.name}</h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Your AI Mentor</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-850 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 relative">
              "Congratulations on finishing your profile onboarding. Today we will start with simple Arrays and Strings Warm-up quests. Make sure you don't break your streak on day one!"
            </div>

            <button
              onClick={() => router.push("/chat")}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <MessageSquare className="w-4 h-4" /> Chat with {data.mentor.name}
            </button>
          </div>

          {/* Placement Goals / Info Card */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm dark:shadow-none">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Focus Intelligence
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-850/60 pb-3">
                <span className="text-slate-500 dark:text-slate-400">Target Company</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{data.user.targetCompany}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200 dark:border-slate-850/60 pb-3">
                <span className="text-slate-500 dark:text-slate-400">Weak Topic</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{data.stats.weakestTopic || "None detected"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Strongest Topic</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.stats.strongestTopic || "None detected"}</span>
              </div>
            </div>
          </div>

          {/* Premium Billing Upgrade Card */}
          {data.user.plan === "FREE" && (
            <div className="bg-gradient-to-r from-indigo-50 via-white to-slate-50 dark:from-indigo-950/40 dark:via-indigo-900/10 dark:to-slate-900/40 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
              <div>
                <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-extrabold uppercase tracking-wider bg-yellow-100 dark:bg-yellow-950/30 border border-yellow-250 dark:border-yellow-500/20 px-2 py-0.5 rounded">UNLOCK ADVANCED</span>
                <h3 className="font-extrabold text-md mt-1.5 text-slate-850 dark:text-slate-100 font-sans">Upgrade to CodeRun Premium</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  Gain access to the full placement suite, unlock premium dashboard analytics, and priority mentor advice.
                </p>
              </div>

              <button
                onClick={handleUpgradePlan}
                disabled={actionLoading}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-450 hover:to-amber-550 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-850 text-slate-950 rounded-xl text-xs font-black transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Upgrade to Premium ($9)"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Simple loader helper inline
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
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
