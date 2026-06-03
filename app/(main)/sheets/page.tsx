import Link from "next/link";
import type { Metadata } from "next";
import { Layers, ArrowRight, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheetSummaries } from "@/lib/sheets";

export const metadata: Metadata = {
  title: "DSA Sheets",
  description:
    "Track your progress through curated DSA sheets like Striver's SDE, A2Z, and the 79 last-moment revision sheet.",
};

export default async function SheetsPage() {
  const summaries = getSheetSummaries();

  // Resolve per-sheet completed counts for the signed-in user in one query.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let completedBySlug: Record<string, number> = {};
  if (user) {
    const grouped = await db.sheetProgress.groupBy({
      by: ["sheetSlug"],
      where: { userId: user.id },
      _count: { _all: true },
    });
    completedBySlug = Object.fromEntries(
      grouped.map((g) => [g.sheetSlug, g._count._all])
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Layers className="w-5 h-5 text-indigo-500" />
        <h1 className="font-extrabold text-xl text-foreground">DSA Sheets</h1>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Work through hand-picked problem sets and tick problems off as you
          solve them. Your progress is saved automatically and synced across
          devices.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {summaries.map((s) => {
            const done = completedBySlug[s.slug] || 0;
            const pct = s.total > 0 ? Math.round((done / s.total) * 100) : 0;
            return (
              <Link
                key={s.slug}
                href={`/sheets/${s.slug}`}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-md transition flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-black text-lg text-foreground group-hover:text-indigo-500 transition truncate">
                      {s.name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      {s.total} problems · {s.sectionCount} sections
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition shrink-0" />
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                )}

                {/* Difficulty mix */}
                <div className="flex items-center gap-3 mt-4 text-[10px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {s.difficultyCounts.easy} Easy
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-500">
                    {s.difficultyCounts.medium} Med
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    {s.difficultyCounts.hard} Hard
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-muted-foreground">
                      {done} / {s.total} solved
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
