import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { buildStudyPlan } from "@/lib/study-plan";

// Canonical interview topic order used to fill the plan beyond a user's weak
// topics (matches the labels our sheets / topic classifier use).
const INTERVIEW_TOPICS = [
  "Arrays", "Strings", "Hashing", "Two Pointers", "Sliding Window",
  "Binary Search", "Stack", "Linked List", "Trees", "Heap",
  "Backtracking", "Graph", "Dynamic Programming", "Greedy",
  "Intervals", "Bit Manipulation", "Math",
];

function daysBetween(target: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86400000);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [pref, profile, weakPerf] = await Promise.all([
      db.userPreference.findUnique({ where: { userId: user.id } }),
      db.leetcodeProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      }),
      db.topicPerformance.findMany({
        where: { userId: user.id },
        orderBy: { solved: "asc" },
        take: 6,
        select: { topic: true },
      }),
    ]);

    let solvedSlugs = new Set<string>();
    if (profile) {
      const rows = await db.leetcodeSolvedProblem.findMany({
        where: { profileId: profile.id },
        select: { titleSlug: true },
      });
      solvedSlugs = new Set(rows.map((r) => r.titleSlug.toLowerCase()));
    }

    const interviewDate = pref?.interviewDate ?? null;
    const dailyTarget = pref?.dailyQuestionTarget ?? 3;
    const daysUntil = interviewDate
      ? Math.max(1, daysBetween(interviewDate))
      : 14;

    const plan = buildStudyPlan({
      weakTopics: weakPerf.map((w) => w.topic),
      allTopics: INTERVIEW_TOPICS,
      solvedSlugs,
      perDay: dailyTarget,
      daysUntil,
    });

    return NextResponse.json({
      success: true,
      interviewDate,
      dailyTarget,
      daysUntil: interviewDate ? daysBetween(interviewDate) : null,
      plan,
    });
  } catch (error: any) {
    console.error("Error in /api/study-plan GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load study plan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const dateStr = typeof body.interviewDate === "string" ? body.interviewDate : null;
    const dailyTarget =
      typeof body.dailyTarget === "number"
        ? Math.max(1, Math.min(10, Math.round(body.dailyTarget)))
        : undefined;

    let interviewDate: Date | null | undefined = undefined;
    if (dateStr === "") interviewDate = null; // explicit clear
    else if (dateStr) {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) interviewDate = d;
    }

    await db.userPreference.upsert({
      where: { userId: user.id },
      update: {
        ...(interviewDate !== undefined ? { interviewDate } : {}),
        ...(dailyTarget !== undefined ? { dailyQuestionTarget: dailyTarget } : {}),
      },
      create: {
        userId: user.id,
        interviewDate: interviewDate ?? null,
        dailyQuestionTarget: dailyTarget ?? 3,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/study-plan POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save study plan settings." },
      { status: 500 }
    );
  }
}
