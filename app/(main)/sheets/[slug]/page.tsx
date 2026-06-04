import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheet, getSheetSlugs } from "@/lib/sheets";
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
  if (user) {
    const rows = await db.sheetProgress.findMany({
      where: { userId: user.id, sheetSlug: slug },
      select: { problemKey: true },
    });
    initialCompleted = rows.map((r) => r.problemKey);
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
      isGuest={!user}
    />
  );
}
