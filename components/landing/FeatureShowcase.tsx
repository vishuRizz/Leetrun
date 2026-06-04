import React from "react";
import Link from "next/link";
import {
  Layers,
  Network,
  BarChart3,
  Trophy,
  Users,
  RefreshCw,
  ArrowRight,
  Gamepad2,
  Sparkles,
  Building2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

const creatorSheets: {
  creator: string;
  tag: string;
  sheets: { name: string; slug: string }[];
}[] = [
  {
    creator: "Striver",
    tag: "takeUforward",
    sheets: [
      { name: "Striver SDE Sheet", slug: "striver-sde" },
      { name: "Striver A2Z Sheet", slug: "striver-a2z" },
      { name: "Striver 79 (Last Moment)", slug: "striver-79" },
    ],
  },
  {
    creator: "Love Babbar",
    tag: "450 DSA",
    sheets: [{ name: "Love Babbar 450", slug: "love-babbar-450" }],
  },
  {
    creator: "NeetCode",
    tag: "Patterns",
    sheets: [{ name: "NeetCode 150", slug: "neetcode-150" }],
  },
  {
    creator: "Community",
    tag: "Classic",
    sheets: [{ name: "Blind 75", slug: "blind-75" }],
  },
  {
    creator: "Company-wise",
    tag: "Targeted",
    sheets: [
      { name: "Google Top 100", slug: "google-top-100" },
      { name: "Amazon Top 100", slug: "amazon-top-100" },
    ],
  },
];

const features: {
  icon: typeof Layers;
  title: string;
  desc: string;
  href: string;
  cta: string;
  dark?: boolean;
}[] = [
  {
    icon: Layers,
    title: "Access every DSA sheet",
    desc: "Open any curated or company sheet, see every problem with its LeetCode link, and track what's done - all in one place.",
    href: "/sheets",
    cta: "Browse sheets",
  },
  {
    icon: Network,
    title: "Interview patterns & templates",
    desc: "The patterns interviewers ask most, ranked by weightage, with ready-to-use C++ templates and pattern-wise practice problems.",
    href: "/patterns",
    cta: "Explore patterns",
  },
  {
    icon: BarChart3,
    title: "Deep LeetCode analytics",
    desc: "Solve breakdowns, topic mastery, language stats, a 12-week activity heatmap, streaks, XP and levels - your whole prep, visualized.",
    href: "/analytics",
    cta: "See analytics",
  },
  {
    icon: Trophy,
    title: "Competitive leaderboard",
    desc: "Climb global rankings by XP, level, streak, solved counts, or LeetCode contest rating. Add friends for a private board.",
    href: "/leaderboard",
    cta: "View leaderboard",
  },
  {
    icon: Users,
    title: "Group competitions & coding games",
    desc: "Spin up multiplayer rooms, invite your batch, and race through problems in real time. Mock contests and friendly rivalry, built in.",
    href: "/rooms",
    cta: "Start a room",
    dark: true,
  },
  {
    icon: Sparkles,
    title: "Adaptive quests & AI mentor",
    desc: "Daily, weekly and custom revision quests auto-verified from your real solves, plus an AI mentor that roasts you back on track.",
    href: "/dashboard",
    cta: "Open dashboard",
  },
];

export default function FeatureShowcase() {
  return (
    <div className="bg-gray-50 dark:bg-[#0a0a0a] text-[#1a1b23] dark:text-white border-t border-gray-100 dark:border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
            Everything you get
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold mb-5 leading-tight tracking-tight">
            Every feature, clearly laid out.
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Click into anything below - no signup needed. You&apos;re browsing a
            live preview with sample progress; sign up to make it track your own.
          </p>
        </div>

        {/* Auto-tracking sheets from your favorite creators */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141414] p-6 sm:p-8 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">
                  Auto-tracked sheets from your favorite creators
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Deep Sync imports your LeetCode solves and checks them off
                  automatically across every sheet.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creatorSheets.map((group) =>
              group.sheets.map((sheet) => (
                <Link
                  key={sheet.slug}
                  href={`/sheets/${sheet.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f] px-4 py-3 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-[#181818] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-sm truncate">
                        {sheet.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-6">
                      {group.creator} · {group.tag}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Auto-checks solved problems
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Curated + company-wise
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Guest preview shows sample progress
            </span>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.title}
                href={f.href}
                className={`group rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  f.dark
                    ? "bg-[#1a1b23] dark:bg-[#141414] border-gray-800 text-white"
                    : "bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 dark:hover:border-gray-700"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    f.dark ? "bg-indigo-500/20" : "bg-indigo-500/10"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      f.dark ? "text-indigo-400" : "text-indigo-500"
                    }`}
                  />
                </div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  {f.dark ? <Gamepad2 className="w-4 h-4 text-indigo-400" /> : null}
                  {f.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-4 ${
                    f.dark ? "text-gray-300" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {f.desc}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                    f.dark
                      ? "text-white"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {f.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
