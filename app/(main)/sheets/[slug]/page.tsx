import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheet, getSheetSlugs, problemRef } from "@/lib/sheets";
import SheetView from "./SheetView";

export function generateStaticParams() {
  return getSheetSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sheet = getSheet(slug);
  if (!sheet) return { title: "Sheet not found" };
  return {
    title: sheet.name,
    description:
      sheet.description ||
      `Track your progress through ${sheet.name} - ${sheet.total} curated DSA problems.`,
  };
}

export default async function SheetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sheet = getSheet(slug);
  if (!sheet) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialCompleted: string[] = [];
  let initialNotes: Record<string, string> = {};
  if (user) {
    const [rows, noteRows] = await Promise.all([
      db.sheetProgress.findMany({
        where: { userId: user.id, sheetSlug: slug },
        select: { problemKey: true },
      }),
      db.problemNote.findMany({
        where: { userId: user.id },
        select: { problemRef: true, content: true },
      }),
    ]);
    initialCompleted = rows.map((r) => r.problemKey);

    // Keep only notes whose ref matches a problem in this sheet.
    const refsInSheet = new Set<string>();
    sheet.sections.forEach((sec) =>
      sec.problems.forEach((p) => refsInSheet.add(problemRef(p, slug)))
    );
    const noteMap: Record<string, string> = {};
    for (const n of noteRows) {
      if (refsInSheet.has(n.problemRef)) noteMap[n.problemRef] = n.content;
    }
    initialNotes = noteMap;
  } else {
    // Guest preview: scatter sample "solved" marks (~42%) across the sheet so
    // the auto-tracking experience is obvious. Editing is gated behind signup.
    const keys: string[] = [];
    sheet.sections.forEach((sec) =>
      sec.problems.forEach((p) => keys.push(p.key))
    );
    initialCompleted = keys.filter((_, i) => i % 12 < 5);
  }

  return (
    <SheetView
      sheet={sheet}
      initialCompleted={initialCompleted}
      initialNotes={initialNotes}
      isGuest={!user}
    />
  );
}
