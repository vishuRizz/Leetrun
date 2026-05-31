"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Flame,
  Award,
  CircleDollarSign,
  TrendingUp,
  Target,
  GraduationCap,
  Calendar,
  Bookmark,
  Languages,
  CheckCircle2,
  Sparkles,
  Crown,
  Medal,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  collegeName: string | null;
  targetCompany: string | null;
  level: string;
  totalXp: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  plan: string;
  stats: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    consistencyScore: number;
    strongestTopic: string | null;
    weakestTopic: string | null;
  } | null;
  leetcodeProfile: {
    username: string;
    ranking: number | null;
    reputation: number | null;
    contestRating: number | null;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    acceptanceRate: number | null;
    languageStats: Array<{
      id: string;
      language: string;
      solved: number;
    }>;
    submissions: Array<{
      id: string;
      title: string;
      slug: string;
      difficulty: string;
      topic: string | null;
      submittedAt: string;
    }>;
  } | null;
  badges: Array<{
    id: string;
    unlockedAt: string;
    badge: {
      title: string;
      description: string;
      icon: string;
      type: string;
    };
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-muted-foreground text-sm">Synchronizing dashboard analytics...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Please log in to see your profile.</p>
        <button
          onClick={() => router.push("/login")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const userStats = profile.stats || {
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    consistencyScore: 0,
    strongestTopic: "N/A",
    weakestTopic: "N/A",
  };

  // Safe variables for percentages
  const easyPct = userStats.totalSolved > 0 ? (userStats.easySolved / userStats.totalSolved) * 100 : 0;
  const mediumPct = userStats.totalSolved > 0 ? (userStats.mediumSolved / userStats.totalSolved) * 100 : 0;
  const hardPct = userStats.totalSolved > 0 ? (userStats.hardSolved / userStats.totalSolved) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl text-foreground">User Profile</h1>
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Profile Card Header */}
        <section className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            {/* Avatar Placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl font-black shadow-lg shadow-indigo-600/5 uppercase">
              {profile.fullName ? profile.fullName[0] : profile.email[0]}
            </div>

            <div className="text-center md:text-left space-y-1.5">
              <h2 className="text-2xl font-black text-foreground">
                {profile.fullName || profile.email.split("@")[0]}
              </h2>
              <p className="text-muted-foreground text-xs flex items-center justify-center md:justify-start gap-1">
                <Bookmark className="w-3.5 h-3.5" /> {profile.email}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                {profile.collegeName && (
                  <span className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-[10px] font-bold text-foreground border border-border">
                    <GraduationCap className="w-3 h-3 text-indigo-500" /> {profile.collegeName}
                  </span>
                )}
                {profile.targetCompany && (
                  <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    <Target className="w-3 h-3 text-indigo-500 dark:text-indigo-400 animate-pulse" /> Target: {profile.targetCompany}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  profile.plan === "PREMIUM"
                    ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {profile.plan === "PREMIUM" ? (
                    <span className="flex items-center gap-1.5"><Crown className="w-4 h-4" /> PREMIUM</span>
                  ) : "FREE PLAN"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics stats */}
          <div className="flex gap-4">
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Flame className="w-5 h-5 text-orange-500 fill-current mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.currentStreak}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Streak</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Award className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">Lv. {Math.floor(profile.totalXp / 100) + 1}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{profile.totalXp} XP</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <CircleDollarSign className="w-5 h-5 text-yellow-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.coins}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Coins</div>
            </div>
          </div>
        </section>

        {/* Breakdown section grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Solved stats ring */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Trophy className="w-4 h-4 text-indigo-500" /> Solved Breakdown
            </h3>

            <div className="flex items-center justify-around">
              {/* LeetCode Sync profile status */}
              {profile.leetcodeProfile ? (
                <div className="text-center space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">LeetCode Username</div>
                  <div className="text-sm font-bold text-foreground">@{profile.leetcodeProfile.username}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Ranking: <span className="font-bold text-indigo-600 dark:text-indigo-400">#{profile.leetcodeProfile.ranking || "N/A"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs py-4 text-center">No connected LeetCode username synced yet.</div>
              )}
            </div>

            {/* Solved categories */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">Easy Solved</span>
                  <span className="text-foreground">{userStats.easySolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${easyPct}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-yellow-600 dark:text-yellow-500">Medium Solved</span>
                  <span className="text-foreground">{userStats.mediumSolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-yellow-500 h-full transition-all" style={{ width: `${mediumPct}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-600 dark:text-rose-500">Hard Solved</span>
                  <span className="text-foreground">{userStats.hardSolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${hardPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Overall Rate */}
            {profile.leetcodeProfile?.acceptanceRate && (
              <div className="bg-muted p-4 border border-border rounded-xl flex items-center justify-between text-xs">
                <span className="text-muted-foreground">LeetCode Acceptance Rate</span>
                <span className="font-bold text-foreground">{profile.leetcodeProfile.acceptanceRate.toFixed(1)}%</span>
              </div>
            )}
          </section>

          {/* Languages distribution */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Languages className="w-4 h-4 text-indigo-500" /> Language Distribution
            </h3>

            {!profile.leetcodeProfile?.languageStats || profile.leetcodeProfile.languageStats.length === 0 ? (
              <p className="text-muted-foreground text-xs py-8 text-center">No language stats available.</p>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.leetcodeProfile.languageStats.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{item.language}</span>
                    <span className="font-semibold bg-muted px-2.5 py-1 border border-border rounded text-foreground">
                      {item.solved} solved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Badges Section */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Earned Badges
            </h3>

            {profile.badges.length === 0 ? (
              <p className="text-muted-foreground text-xs py-10 text-center">
                Keep hitting streaks and challenge rooms to unlock progression badges!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.badges.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-muted border border-border rounded-xl text-center space-y-1.5 flex flex-col items-center justify-center hover:border-indigo-500/40 transition"
                  >
                    <span className="text-indigo-500">
                      {b.badge.icon ? (
                        <span className="text-2xl">{b.badge.icon}</span>
                      ) : (
                        <Medal className="w-8 h-8" />
                      )}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-[11px] text-foreground leading-tight">{b.badge.title}</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{b.badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Billing Management Section */}
        <section className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-foreground">Account Subscription</h3>
            <p className="text-xs text-muted-foreground">
              {profile.plan === "PREMIUM"
                ? "You have full access to the placement suite, premium AI model logic, and priority mentor advice."
                : "Your account is currently on the Free tier. Upgrade to unlock all premium capabilities."}
            </p>
          </div>
          <div>
            {profile.plan === "PREMIUM" ? (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fetch("/api/subscription/upgrade", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "cancel" }),
                    });
                    await fetchProfile();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/35 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel Premium
              </button>
            ) : (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fetch("/api/subscription/upgrade", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    await fetchProfile();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white px-6 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Upgrade to Premium ($0.20/mo)
              </button>
            )}
          </div>
        </section>

        {/* Recent Submissions List */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Recent Synced Submissions
          </h3>

          {!profile.leetcodeProfile?.submissions || profile.leetcodeProfile.submissions.length === 0 ? (
            <p className="text-muted-foreground text-xs py-8 text-center">No recent submissions synced yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 font-bold uppercase tracking-wider">Problem Name</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Topic</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Difficulty</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-right">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.leetcodeProfile.submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/40 transition">
                      <td className="py-3 font-bold text-foreground">
                        <a
                          href={`https://leetcode.com/problems/${sub.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1.5"
                        >
                          {sub.title}
                        </a>
                      </td>
                      <td className="py-3">
                        <span className="bg-muted px-2 py-0.5 border border-border rounded text-muted-foreground font-semibold">
                          {sub.topic || "General"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${
                            sub.difficulty === "HARD"
                              ? "text-rose-600 dark:text-rose-400"
                              : sub.difficulty === "MEDIUM"
                              ? "text-yellow-600 dark:text-yellow-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {sub.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
