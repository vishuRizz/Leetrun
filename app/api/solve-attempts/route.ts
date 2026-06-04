import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const MAX_SECONDS = 6 * 60 * 60; // 6h sanity cap

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attempts = await db.solveAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Aggregate average solve time per difficulty.
    const buckets: Record<string, { total: number; count: number }> = {};
    for (const a of attempts) {
      const d = (a.difficulty || "unknown").toLowerCase();
      if (!buckets[d]) buckets[d] = { total: 0, count: 0 };
      buckets[d].total += a.seconds;
      buckets[d].count += 1;
    }
    const byDifficulty = Object.entries(buckets).map(([difficulty, b]) => ({
      difficulty,
      avgSeconds: Math.round(b.total / b.count),
      count: b.count,
    }));

    const fastest = attempts.reduce<typeof attempts[number] | null>(
      (best, a) => (best === null || a.seconds < best.seconds ? a : best),
      null
    );

    return NextResponse.json({
      success: true,
      total: attempts.length,
      byDifficulty,
      fastest: fastest
        ? { title: fastest.title, seconds: fastest.seconds }
        : null,
      recent: attempts.slice(0, 10).map((a) => ({
        title: a.title,
        difficulty: a.difficulty,
        seconds: a.seconds,
        confidence: a.confidence,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/solve-attempts GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load solve attempts." },
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
    const problemRef = typeof body.problemRef === "string" ? body.problemRef.trim() : "";
    const seconds = Number(body.seconds);
    if (!problemRef || !Number.isFinite(seconds) || seconds <= 0) {
      return NextResponse.json(
        { error: "problemRef and a positive seconds value are required." },
        { status: 400 }
      );
    }

    const confidence =
      typeof body.confidence === "string" &&
      ["EASY", "OK", "HARD"].includes(body.confidence)
        ? body.confidence
        : null;

    const attempt = await db.solveAttempt.create({
      data: {
        userId: user.id,
        problemRef: problemRef.slice(0, 200),
        title: typeof body.title === "string" ? body.title.slice(0, 200) : null,
        difficulty:
          typeof body.difficulty === "string" ? body.difficulty.slice(0, 16) : null,
        seconds: Math.min(MAX_SECONDS, Math.round(seconds)),
        confidence,
      },
    });

    return NextResponse.json({ success: true, id: attempt.id });
  } catch (error: any) {
    console.error("Error in /api/solve-attempts POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save attempt." },
      { status: 500 }
    );
  }
}
