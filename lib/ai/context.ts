import { db } from "@/lib/db";
import { ChallengeStatus } from "@prisma/client";
import { getSheetSummaries } from "@/lib/sheets";

/**
 * Rich, accurate snapshot of a user's prep state for the AI mentor.
 *
 * This deliberately pulls from the *correct* sources:
 * - Difficulty splits from LeetcodeProfile (real), not the guessed values in
 *   the shallow `LeetcodeSubmission` table.
 * - Recent solves from `LeetcodeSolvedProblem` (deep-synced, real difficulty).
 * - All topic performance rows (not just one weakest/strongest).
 * - Sheet completion %, solve-speed timings, and the active quest.
 */
export interface UserAIContext {
  name: string;
  level: string;
  plan: string;
  targetCompany: string;
  joinedDaysAgo: number | null;

  mentorName: string;
  baseVibe: string;
  favoriteSeries: string;

  currentStreak: number;
  streakStale: boolean;

  leetcode: {
    connected: boolean;
    username: string | null;
    ranking: number | string;
    acceptanceRate: string;
    total: number;
    easy: number;
    medium: number;
    hard: number;
    languages: string;
    deepSolvedCount: number;
    recentSolved: { title: string; difficulty: string; slug: string }[];
    lastSyncedAt: Date | null;
  };

  topics: {
    weak: { topic: string; solved: number; mastery: number }[];
    strong: { topic: string; solved: number; mastery: number }[];
  };

  sheets: { name: string; done: number; total: number; pct: number }[];

  speed: { difficulty: string; avgSeconds: number; count: number }[];

  activeQuest: string | null;

  interviewDate: Date | null;
  daysToInterview: number | null;
  dailyTarget: number;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/** First name only, so the mentor addresses the user casually. */
function firstName(fullName: string | null | undefined): string {
  const first = (fullName || "").trim().split(/\s+/)[0];
  return first || "Code Runner";
}

export async function buildUserContext(userId: string): Promise<UserAIContext | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      stats: true,
      preferences: true,
      aiCompanion: true,
      leetcodeProfile: { include: { languageStats: true } },
      userChallenges: {
        where: { status: ChallengeStatus.ACTIVE },
        include: { challenge: { include: { problems: true } } },
      },
    },
  });

  if (!user) return null;

  const profileId = user.leetcodeProfile?.id;

  const [topicPerfs, sheetGroups, solveAttempts, deepSolvedCount, recentSolvedRows] =
    await Promise.all([
      db.topicPerformance.findMany({
        where: { userId },
        orderBy: { masteryLevel: "asc" },
      }),
      db.sheetProgress.groupBy({
        by: ["sheetSlug"],
        where: { userId },
        _count: { _all: true },
      }),
      db.solveAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      profileId
        ? db.leetcodeSolvedProblem.count({ where: { profileId } })
        : Promise.resolve(0),
      profileId
        ? db.leetcodeSolvedProblem.findMany({
            where: { profileId },
            orderBy: { syncedAt: "desc" },
            take: 8,
            select: { title: true, difficulty: true, titleSlug: true },
          })
        : Promise.resolve([]),
    ]);

  // ---- Topics: weakest (lowest mastery, with some attempts) + strongest ----
  const withActivity = topicPerfs.filter((t) => t.solved > 0 || t.attempts > 0);
  const weak = withActivity
    .slice(0, 4)
    .map((t) => ({ topic: t.topic, solved: t.solved, mastery: Math.round(t.masteryLevel * 100) }));
  const strong = [...withActivity]
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .slice(0, 3)
    .map((t) => ({ topic: t.topic, solved: t.solved, mastery: Math.round(t.masteryLevel * 100) }));

  // ---- Sheets: completion % ----
  const summaries = getSheetSummaries();
  const totalBySlug = new Map(summaries.map((s) => [s.slug, { name: s.name, total: s.total }]));
  const doneBySlug = new Map(sheetGroups.map((g) => [g.sheetSlug, g._count._all]));
  const sheets = Array.from(doneBySlug.entries())
    .map(([slug, done]) => {
      const meta = totalBySlug.get(slug);
      const total = meta?.total || 0;
      return {
        name: meta?.name || slug,
        done,
        total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    })
    .filter((s) => s.done > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // ---- Solve speed: average per difficulty ----
  const speedBuckets: Record<string, { total: number; count: number }> = {};
  for (const a of solveAttempts) {
    const d = (a.difficulty || "unknown").toLowerCase();
    if (!speedBuckets[d]) speedBuckets[d] = { total: 0, count: 0 };
    speedBuckets[d].total += a.seconds;
    speedBuckets[d].count += 1;
  }
  const speed = Object.entries(speedBuckets).map(([difficulty, b]) => ({
    difficulty,
    avgSeconds: Math.round(b.total / b.count),
    count: b.count,
  }));

  // ---- Streak staleness ----
  const streakStale =
    user.currentStreak === 0 ||
    !user.lastStreakAt ||
    daysBetween(user.lastStreakAt, new Date()) >= 2;

  // ---- Interview countdown ----
  const interviewDate = user.preferences?.interviewDate ?? null;
  const daysToInterview = interviewDate
    ? Math.max(0, daysBetween(new Date(), interviewDate))
    : null;

  const activeChallenge = user.userChallenges[0]?.challenge;
  const activeQuest = activeChallenge
    ? `"${activeChallenge.title}" - ${activeChallenge.problems
        .map((p) => `${p.problemName} (${p.difficulty}/${p.topic})`)
        .join(", ")}`
    : null;

  return {
    name: firstName(user.fullName),
    level: user.level,
    plan: user.plan,
    targetCompany: user.targetCompany || "top-tier tech companies",
    joinedDaysAgo: user.createdAt ? daysBetween(user.createdAt, new Date()) : null,

    mentorName: user.aiCompanion?.name || "Sensei",
    baseVibe: user.aiCompanion?.personalityPrompt || "You are a supportive DSA mentor.",
    favoriteSeries: user.favoriteSeries || "NARUTO",

    currentStreak: user.currentStreak || 0,
    streakStale,

    leetcode: {
      connected: Boolean(user.leetcodeProfile),
      username: user.leetcodeProfile?.username || null,
      ranking: user.leetcodeProfile?.ranking || "N/A",
      acceptanceRate: user.leetcodeProfile?.acceptanceRate
        ? `${user.leetcodeProfile.acceptanceRate.toFixed(1)}%`
        : "N/A",
      total: user.leetcodeProfile?.totalSolved || user.stats?.totalSolved || 0,
      easy: user.leetcodeProfile?.easySolved || 0,
      medium: user.leetcodeProfile?.mediumSolved || 0,
      hard: user.leetcodeProfile?.hardSolved || 0,
      languages:
        user.leetcodeProfile?.languageStats.map((l) => `${l.language}: ${l.solved}`).join(", ") ||
        "None",
      deepSolvedCount,
      recentSolved: recentSolvedRows.map((r) => ({
        title: r.title,
        difficulty: r.difficulty,
        slug: r.titleSlug,
      })),
      lastSyncedAt: user.leetcodeProfile?.syncedAt ?? user.stats?.lastSyncedAt ?? null,
    },

    topics: { weak, strong },
    sheets,
    speed,
    activeQuest,

    interviewDate,
    daysToInterview,
    dailyTarget: user.preferences?.dailyQuestionTarget || 3,
  };
}

/** Render the context as a compact block for the system prompt. */
export function renderContextBlock(ctx: UserAIContext): string {
  const lc = ctx.leetcode;
  const fmtSpeed = ctx.speed.length
    ? ctx.speed
        .map((s) => `${s.difficulty}: ~${Math.round(s.avgSeconds / 60)}m avg (${s.count})`)
        .join(", ")
    : "no timed attempts yet";
  const weak = ctx.topics.weak.length
    ? ctx.topics.weak.map((t) => `${t.topic} (${t.solved} solved, ${t.mastery}% mastery)`).join("; ")
    : "not enough data yet";
  const strong = ctx.topics.strong.length
    ? ctx.topics.strong.map((t) => `${t.topic} (${t.mastery}%)`).join("; ")
    : "not enough data yet";
  const sheets = ctx.sheets.length
    ? ctx.sheets.map((s) => `${s.name} ${s.done}/${s.total} (${s.pct}%)`).join("; ")
    : "no sheet progress yet";
  const recent = lc.recentSolved.length
    ? lc.recentSolved.map((r) => `${r.title} (${r.difficulty})`).join(", ")
    : "none";

  return [
    `Student: ${ctx.name} | Level: ${ctx.level} | Plan: ${ctx.plan} | Target: ${ctx.targetCompany}`,
    ctx.joinedDaysAgo != null ? `On LeetRun for ${ctx.joinedDaysAgo} days.` : "",
    `Streak: ${ctx.currentStreak} days${ctx.streakStale ? " (STALE - they've slipped)" : ""}.`,
    `LeetCode: @${lc.username ?? "not connected"} (rank #${lc.ranking}, acceptance ${lc.acceptanceRate}).`,
    `Solved: ${lc.total} total - Easy ${lc.easy}, Medium ${lc.medium}, Hard ${lc.hard}. Deep-synced full list: ${lc.deepSolvedCount} problems.`,
    `Languages: ${lc.languages}.`,
    `Most recent solves: ${recent}.`,
    `Weakest topics: ${weak}.`,
    `Strongest topics: ${strong}.`,
    `Sheet progress: ${sheets}.`,
    `Solve speed: ${fmtSpeed}.`,
    ctx.activeQuest ? `Active quest: ${ctx.activeQuest}.` : "No active quest right now.",
    ctx.daysToInterview != null
      ? `Interview in ${ctx.daysToInterview} days (target ${ctx.dailyTarget} problems/day).`
      : "No interview date set.",
  ]
    .filter(Boolean)
    .join("\n");
}
