import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  generateDailyChallenge,
  generateWeeklyChallenge,
  expireStaleActiveChallenges,
  verifyChallengeCompletion,
} from "@/lib/services/challenge";
import { ChallengeStatus, ChallengeType } from "@prisma/client";

const CHALLENGE_INCLUDE = {
  challenge: { include: { problems: true } },
  problemProgress: true,
} as const;

// Lightweight DB-only fetch for a single challenge type.
async function getOrCreateChallenge(userId: string, type: ChallengeType) {
  const active = await db.userChallenge.findFirst({
    where: {
      userId,
      status: ChallengeStatus.ACTIVE,
      challenge: { type },
    },
    include: CHALLENGE_INCLUDE,
  });
  if (active) return active;

  // Look for a recently completed challenge in the relevant window
  const rangeStart = new Date();
  if (type === ChallengeType.WEEKLY) {
    rangeStart.setDate(rangeStart.getDate() - 7);
  } else {
    rangeStart.setHours(0, 0, 0, 0);
  }

  const completedRecently = await db.userChallenge.findFirst({
    where: {
      userId,
      status: ChallengeStatus.COMPLETED,
      challenge: { type },
      completedAt: { gte: rangeStart },
    },
    include: CHALLENGE_INCLUDE,
  });
  if (completedRecently) return completedRecently;

  // Otherwise generate a new one. Revision quests are NOT auto-generated —
  // they're built on demand from the user's configuration in the revision tab.
  if (type === ChallengeType.REVISION) return null;

  const result =
    type === ChallengeType.DAILY
      ? await generateDailyChallenge(userId)
      : await generateWeeklyChallenge(userId);

  return db.userChallenge.findUnique({
    where: { id: result.userChallenge.id },
    include: CHALLENGE_INCLUDE,
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expire yesterday's daily/revision quests and last week's weekly quest so
    // fresh ones get generated below. Must run BEFORE the get-or-create calls.
    await expireStaleActiveChallenges(authUser.id);

    // Auto-complete any quests whose problems are already in the user's solve
    // history (recent + deep-synced). DB-only, no external LeetCode call.
    await verifyChallengeCompletion(authUser.id).catch(() => {});

    // Run user profile + 3 challenge resolutions fully in parallel.
    // Profile query is intentionally slim — only what the dashboard renders.
    const [dbUser, daily, weekly, revision] = await Promise.all([
      db.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          fullName: true,
          targetCompany: true,
          plan: true,
          totalXp: true,
          coins: true,
          currentStreak: true,
          stats: {
            select: {
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
              weakestTopic: true,
              strongestTopic: true,
              lastSyncedAt: true,
            },
          },
          aiCompanion: { select: { name: true } },
          leetcodeProfile: {
            select: {
              username: true,
              totalSolved: true,
              easySolved: true,
              mediumSolved: true,
              hardSolved: true,
              syncedAt: true,
            },
          },
        },
      }),
      getOrCreateChallenge(authUser.id, ChallengeType.DAILY),
      getOrCreateChallenge(authUser.id, ChallengeType.WEEKLY),
      getOrCreateChallenge(authUser.id, ChallengeType.REVISION),
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const lc = dbUser.leetcodeProfile;
    const stats = dbUser.stats;

    const totalSolved = stats?.totalSolved ?? lc?.totalSolved ?? 0;

    const response = NextResponse.json({
      success: true,
      user: {
        fullName: dbUser.fullName || "Code Runner",
        level:
          totalSolved >= 300
            ? "ADVANCED"
            : totalSolved >= 100
            ? "INTERMEDIATE"
            : "BEGINNER",
        currentStreak: dbUser.currentStreak || 0,
        totalXp: dbUser.totalXp || 0,
        coins: dbUser.coins || 0,
        targetCompany: dbUser.targetCompany || "Google",
        plan: dbUser.plan || "FREE",
      },
      mentor: {
        name: dbUser.aiCompanion?.name || "Sensei",
      },
      stats: {
        totalSolved,
        easySolved: stats?.easySolved ?? lc?.easySolved ?? 0,
        mediumSolved: stats?.mediumSolved ?? lc?.mediumSolved ?? 0,
        hardSolved: stats?.hardSolved ?? lc?.hardSolved ?? 0,
        weakestTopic: stats?.weakestTopic ?? null,
        strongestTopic: stats?.strongestTopic ?? null,
      },
      leetcode: {
        connected: !!lc,
        username: lc?.username || null,
        lastSyncedAt: lc?.syncedAt || stats?.lastSyncedAt || null,
      },
      daily,
      weekly,
      revision,
    });

    // Browser-level caching: keep the dashboard snappy on back-nav and refresh.
    response.headers.set(
      "Cache-Control",
      "private, max-age=10, stale-while-revalidate=60"
    );

    return response;
  } catch (error: any) {
    console.error("Error in /api/dashboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
