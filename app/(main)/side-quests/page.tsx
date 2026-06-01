"use client";

import React from "react";
import Link from "next/link";
import {
  Swords,
  Sparkles,
  Trophy,
  Flame,
  Target,
  Hourglass,
  ArrowRight,
} from "lucide-react";

/**
 * Side Quests is a tease for upcoming gamified mini-challenges that sit
 * outside the daily/weekly/revision quest cycle. The page exists today so
 * the sidebar entry has a destination; once we ship the real feature this
 * file will become its container.
 */
export default function SideQuestsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar — mirrors the look of the other (main) routes */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl text-foreground">Side Quests</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition"
        >
          Back to Dashboard
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto p-6 sm:p-8 space-y-10">
        {/* Hero */}
        <section className="relative overflow-hidden bg-card border border-border rounded-3xl p-10 sm:p-14 text-center">
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 mb-6">
              <Hourglass className="w-3.5 h-3.5" />
              Coming Soon
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-br from-indigo-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent leading-tight">
              Side Quests are<br className="hidden sm:block" /> on the way.
            </h2>

            <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Exciting bite-sized challenges to spice up your placement prep
              speed runs, topic streaks, language gauntlets, friend duels, and
              more. Pick a quest, smash it, stack the XP.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              <Tag color="orange">🔥 Speed runs</Tag>
              <Tag color="indigo">🧠 Topic gauntlets</Tag>
              <Tag color="violet">⚔️ 1v1 duels</Tag>
              <Tag color="amber">🏆 Bonus XP drops</Tag>
            </div>

            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition shadow-lg shadow-indigo-600/20"
            >
              Continue your daily quest
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Sneak peek cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Preview
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            title="Speed Streaks"
            description="Solve N problems back-to-back without slipping. Faster splits earn rarer rewards."
          />
          <Preview
            icon={<Target className="w-5 h-5 text-rose-500" />}
            title="Topic Gauntlets"
            description="Pick a weakness, get 5 hand-picked problems, and turn it into a strength in one sitting."
          />
          <Preview
            icon={<Sparkles className="w-5 h-5 text-violet-500" />}
            title="Daily Drops"
            description="Random bonus quests that show up unannounced — clear them while they last for extra XP and coins."
          />
          <Preview
            icon={<Trophy className="w-5 h-5 text-amber-500" />}
            title="Friend Duels"
            description="Challenge a friend to the same set of problems. First to verify them all wins bragging rights."
          />
          <Preview
            icon={<Swords className="w-5 h-5 text-indigo-500" />}
            title="Company Tracks"
            description="Quick interview-flavored gauntlets tuned to your target company's recent question patterns."
          />
          <Preview
            icon={<Hourglass className="w-5 h-5 text-emerald-500" />}
            title="Time Trials"
            description="Pure speed mode. The clock is ruthless. Climb a dedicated speed-only leaderboard."
          />
        </section>

        <p className="text-center text-[11px] text-muted-foreground">
          We're cooking these up fast. Keep your streak alive and the first
          quests will drop right into your dashboard the moment they ship.
        </p>
      </main>
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "orange" | "indigo" | "violet" | "amber";
}) {
  const tone = {
    orange:
      "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30",
    violet:
      "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-500/30",
    amber:
      "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  }[color];

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold border ${tone}`}
    >
      {children}
    </span>
  );
}

function Preview({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/40 hover:shadow-md transition group">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center group-hover:scale-105 transition">
          {icon}
        </div>
        <h3 className="font-extrabold text-sm text-foreground">{title}</h3>
        <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
          Soon
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
