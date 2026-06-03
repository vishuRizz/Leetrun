import React from "react";
import {
  Layers,
  Network,
  Dices,
  RefreshCw,
  Flame,
  Trophy,
  Users,
  Brain,
  Target,
  UserCircle,
  Building2,
  Sparkles,
} from "lucide-react";

const SHEETS = [
  "Blind 75",
  "NeetCode 150",
  "Striver SDE",
  "Striver A2Z",
  "Love Babbar 450",
  "Google Top 100",
  "Amazon Top 100",
];

const benefits = [
  {
    icon: Network,
    title: "Interview Patterns by Weightage",
    desc: "See the patterns interviewers actually ask most - DP, Graphs, Two Pointers, Sliding Window - ranked by weightage, then drill into pattern-wise questions.",
  },
  {
    icon: Dices,
    title: "Build-Your-Own Revision",
    desc: "Generate a random revision set filtered by topic, difficulty, and whether you've already solved it. Perfect for targeted brush-ups before an interview.",
  },
  {
    icon: Target,
    title: "Adaptive Daily & Weekly Quests",
    desc: "Quests are generated from your weakest topics and target company, then auto-verified against your real LeetCode solves so XP is always earned, never faked.",
  },
  {
    icon: UserCircle,
    title: "Public Profile",
    desc: "Get a shareable profile at leetrun.app/yourname showing your LeetCode analytics, levels, streaks, and badges - drop it in your resume or bio.",
  },
  {
    icon: Trophy,
    title: "Smart Leaderboards",
    desc: "Climb global and private leaderboards ranked by XP, LeetRun level, current streak, solved counts, or LeetCode contest rating - you pick the metric.",
  },
  {
    icon: Brain,
    title: "Savage AI Mentor",
    desc: "Your AI mentor doesn't coddle you. Low solve count? Broken streak? It roasts you back on track - and explains the concepts you keep missing.",
  },
];

export default function FeaturesBenefits() {
  return (
    <div
      id="features"
      className="bg-gray-50 dark:bg-[#0a0a0a] text-[#1a1b23] dark:text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
            Why LeetRun?
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold mb-5 leading-tight tracking-tight">
            Your entire placement prep,
            <br className="hidden sm:block" /> in one ruthless dashboard.
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Most trackers just count your solves. LeetRun gives you curated
            sheets, interview patterns, deep LeetCode sync, adaptive quests, and
            an AI mentor that keeps you accountable - all working together to get
            you placed.
          </p>
        </div>

        {/* Two hero feature cards - the real differentiators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Curated Sheets */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">
                Every sheet that matters
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
              Blind 75, NeetCode 150, Striver&apos;s SDE &amp; A2Z, Love Babbar
              450, plus company-specific sets. Pin your focus sheets and track
              every problem in one place.
            </p>
            <div className="flex flex-wrap gap-2">
              {SHEETS.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Curated + company-wise question banks
            </div>
          </div>

          {/* Deep LeetCode Sync */}
          <div className="rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-800 bg-[#1a1b23] dark:bg-[#141414] text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">Deep LeetCode Sync</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-5">
              Connect once and we import your entire solve history - every
              accepted problem - then automatically check them off across all your
              sheets. No more manually marking what you&apos;ve already done.
            </p>
            <div className="space-y-2.5">
              {[
                "Imports all solved problems, not just recent ones",
                "Auto-marks matching questions on every sheet",
                "Powers accurate quest verification & XP",
              ].map((line) => (
                <div key={line} className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm text-gray-300">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefit grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white dark:bg-[#141414] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md dark:hover:border-gray-700 transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Wide supporting cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-7 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414]">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-indigo-500" />
              <h3 className="text-xl font-bold">Multiplayer Coding Rooms</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Create private rooms, invite friends, and race through DSA problems
              in real time. Mock contests, study sessions, and friendly rivalry to
              keep the prep energy high.
            </p>
          </div>

          <div className="rounded-2xl p-7 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414]">
            <div className="flex items-center gap-3 mb-3">
              <Flame className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold">Streaks, XP &amp; Levels</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Earn XP and coins for solves, streaks, and quests. Level up through
              LeetRun&apos;s progression system and unlock badges as you grind
              toward your dream offer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
