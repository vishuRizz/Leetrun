import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheetSummaries } from "@/lib/sheets";
import SheetsDeepSyncBanner from "@/components/SheetsDeepSyncBanner";
import SheetsBrowser from "./SheetsBrowser";

export const metadata: Metadata = {
  title: "DSA Sheets",
  description:
    "Track your progress through curated DSA sheets like Blind 75, NeetCode 150, Striver's SDE & A2Z, and Love Babbar 450.",
};

export default async function SheetsPage() {
  const summaries = getSheetSummaries();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let completedBySlug: Record<string, number> = {};
  let focus: string[] = [];

  if (user) {
    const [grouped, focusRows] = await Promise.all([
      db.sheetProgress.groupBy({
        by: ["sheetSlug"],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      db.userFocusSheet.findMany({
        where: { userId: user.id },
        orderBy: { addedAt: "asc" },
        select: { sheetSlug: true },
      }),
    ]);
    completedBySlug = Object.fromEntries(
      grouped.map((g) => [g.sheetSlug, g._count._all])
    );
    focus = focusRows.map((r) => r.sheetSlug);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Layers className="w-5 h-5 text-indigo-500" />
        <h1 className="font-extrabold text-xl text-foreground">DSA Sheets</h1>
      </nav>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {user && <SheetsDeepSyncBanner />}

        <SheetsBrowser
          summaries={summaries}
          completedBySlug={completedBySlug}
          initialFocus={focus}
          isGuest={!user}
        />
      </main>
    </div>
  );
}
