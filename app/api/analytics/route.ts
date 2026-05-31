import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ChallengeStatus } from "@prisma/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    // Fan everything out in parallel.
    const [
      user,
      leetcodeProfile,
      stats,
      topicPerformances,
      completedChallenges,
      badgeCount,
      friendsCount,
      xpLogsRecent,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          level: true,
          totalXp: true,
          coins: true,
          currentStreak: true,
          longestStreak: true,
          plan: true,
          targetCompany: true,
          createdAt: true,
        },
      }),
      db.leetcodeProfile.findUnique({
        where: { userId },
        include: {
          languageStats: {
            orderBy: { solved: "desc" },
            take: 6,
          },
        },
      }),
      db.userStats.findUnique({ where: { userId } }),
      db.topicPerformance.findMany({
        where: { userId },
        orderBy: { masteryLevel: "desc" },
      }),
      db.userChallenge.findMany({
        where: { userId, status: ChallengeStatus.COMPLETED },
        select: { challenge: { select: { type: true, xpReward: true } } },
      }),
      db.userBadge.count({ where: { userId } }),
      db.friendship.count({
        where: {
          OR: [
            { requesterId: userId, accepted: true },
            { receiverId: userId, accepted: true },
          ],
        },
      }),
      db.xPLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 7,
        select: { amount: true, reason: true, createdAt: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Compact the 365-day submission calendar into the last 12 weeks for a heatmap.
    // LeetCode returns it as a JSON string keyed by unix-timestamp (seconds).
    const heatmap: { date: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const DAYS = 84; // ~12 weeks

    let calendarMap: Record<string, number> = {};
    if (leetcodeProfile?.submissionCalendar) {
      try {
        const parsed = JSON.parse(leetcodeProfile.submissionCalendar);
        if (parsed && typeof parsed === "object") {
          calendarMap = parsed as Record<string, number>;
        }
      } catch {
        // ignore malformed calendar
      }
    }

    // Pre-bucket calendar by YYYY-MM-DD for O(1) lookup.
    const bucketed: Record<string, number> = {};
    for (const [ts, count] of Object.entries(calendarMap)) {
      const d = new Date(parseInt(ts, 10) * 1000);
      const key = d.toISOString().slice(0, 10);
      bucketed[key] = (bucketed[key] || 0) + (count as number);
    }

    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmap.push({ date: key, count: bucketed[key] || 0 });
    }

    // Roll up completed challenge counts by type.
    const completedByType: Record<string, number> = {
      DAILY: 0,
      WEEKLY: 0,
      REVISION: 0,
      FRIEND: 0,
    };
    let xpFromQuests = 0;
    for (const c of completedChallenges) {
      const t = c.challenge?.type || "DAILY";
      completedByType[t] = (completedByType[t] || 0) + 1;
      xpFromQuests += c.challenge?.xpReward || 0;
    }

    // Activity score: solved per day over the last 12 weeks.
    const activeDays = heatmap.filter((d) => d.count > 0).length;
    const totalRecentSubmissions = heatmap.reduce((s, d) => s + d.count, 0);

    const easy = leetcodeProfile?.easySolved ?? stats?.easySolved ?? 0;
    const medium = leetcodeProfile?.mediumSolved ?? stats?.mediumSolved ?? 0;
    const hard = leetcodeProfile?.hardSolved ?? stats?.hardSolved ?? 0;
    const totalSolved =
      leetcodeProfile?.totalSolved ?? stats?.totalSolved ?? easy + medium + hard;

    const level = Math.floor((user.totalXp || 0) / 100) + 1;
    const xpIntoLevel = (user.totalXp || 0) % 100;

    // Map topic perfs to a UI-friendly slice (top 4 strong, weakest 3).
    const strongTopics = topicPerformances.slice(0, 4).map((p) => ({
      topic: p.topic,
      mastery: Math.round((p.masteryLevel || 0) * 100),
      solved: p.solved,
      attempts: p.attempts,
    }));
    const weakTopics = [...topicPerformances]
      .sort((a, b) => (a.confidenceScore || 0) - (b.confidenceScore || 0))
      .slice(0, 3)
      .map((p) => ({
        topic: p.topic,
        mastery: Math.round((p.masteryLevel || 0) * 100),
        confidence: Math.round((p.confidenceScore || 0) * 100),
      }));

    const response = NextResponse.json({
      success: true,
      user: {
        fullName: user.fullName,
        plan: user.plan,
        targetCompany: user.targetCompany,
        memberSince: user.createdAt,
      },
      leetcode: {
        connected: !!leetcodeProfile,
        username: leetcodeProfile?.username || null,
        totalSolved,
        easy,
        medium,
        hard,
        acceptanceRate: leetcodeProfile?.acceptanceRate ?? null,
        ranking: leetcodeProfile?.ranking ?? null,
        contestRating: leetcodeProfile?.contestRating ?? null,
        syncedAt: leetcodeProfile?.syncedAt ?? null,
        languages: (leetcodeProfile?.languageStats || []).map((l) => ({
          language: l.language,
          solved: l.solved,
        })),
      },
      progression: {
        level,
        totalXp: user.totalXp || 0,
        xpIntoLevel,
        coins: user.coins || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
      },
      topics: {
        strong: strongTopics,
        weak: weakTopics,
      },
      quests: {
        completedByType,
        xpFromQuests,
      },
      social: {
        friends: friendsCount,
        badges: badgeCount,
      },
      activity: {
        heatmap,
        activeDays,
        totalRecentSubmissions,
      },
      recentXp: xpLogsRecent.map((l) => ({
        amount: l.amount,
        reason: l.reason,
        at: l.createdAt,
      })),
    });

    // Snappy cache: data changes slowly enough that 30s is fine.
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=120"
    );

    return response;
  } catch (error: any) {
    console.error("Error in /api/analytics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load analytics." },
      { status: 500 }
    );
  }
}
