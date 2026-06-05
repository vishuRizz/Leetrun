import { db } from "@/lib/db";
import {
  fetchLeetcodeStats,
  fetchRecentSubmissions,
  fetchContestRanking,
} from "./graphql";

// Basic topic classifier based on problem title slug keywords
function classifyTopic(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes("array") || s.includes("subarray") || s.includes("sum") || s.includes("duplicate") || s.includes("merge")) return "Arrays";
  if (s.includes("string") || s.includes("anagram") || s.includes("palindrome") || s.includes("reverse") || s.includes("word")) return "Strings";
  if (s.includes("search") || s.includes("binary") || s.includes("find") || s.includes("kth")) return "Binary Search";
  if (s.includes("tree") || s.includes("bst") || s.includes("node") || s.includes("depth") || s.includes("path")) return "Trees";
  if (s.includes("graph") || s.includes("dfs") || s.includes("bfs") || s.includes("matrix") || s.includes("island")) return "Graph";
  if (s.includes("dp") || s.includes("rob") || s.includes("coin") || s.includes("climb") || s.includes("stock")) return "DP";
  if (s.includes("list") || s.includes("linked")) return "Linked List";
  if (s.includes("sort")) return "Sorting";
  if (s.includes("map") || s.includes("hash") || s.includes("set") || s.includes("contain")) return "HashMap";
  if (s.includes("heap") || s.includes("priority")) return "Heap";
  if (s.includes("greedy") || s.includes("jump") || s.includes("interval")) return "Greedy";
  if (s.includes("backtrack") || s.includes("permute") || s.includes("combine")) return "Backtracking";
  if (s.includes("window") || s.includes("substring")) return "Sliding Window";
  return "Arrays"; // Default fallback
}

const SECONDS_PER_DAY = 86400;

/**
 * Compute the user's real LeetCode activity streak from their submission
 * calendar (a `{ unixSecondsAtUtcMidnight: submissionCount }` map). A day
 * "counts" if it has at least one submission.
 *
 * `current` is the run of consecutive active days ending today (or yesterday,
 * so a user who hasn't solved yet *today* still keeps their streak until the
 * day rolls over). `longest` is the longest consecutive run ever.
 */
export function computeStreakFromCalendar(
  calendarJson: string | null | undefined
): { current: number; longest: number } {
  if (!calendarJson) return { current: 0, longest: 0 };

  let map: Record<string, number>;
  try {
    map = JSON.parse(calendarJson);
  } catch {
    return { current: 0, longest: 0 };
  }
  if (!map || typeof map !== "object") return { current: 0, longest: 0 };

  // Set of active day-indices (days since epoch, UTC).
  const activeDays = new Set<number>();
  for (const [ts, count] of Object.entries(map)) {
    if ((count as number) > 0) {
      const day = Math.floor(Number(ts) / SECONDS_PER_DAY);
      if (!Number.isNaN(day)) activeDays.add(day);
    }
  }
  if (activeDays.size === 0) return { current: 0, longest: 0 };

  const todayDay = Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);

  // Current streak: anchor on today if active, else yesterday (grace period).
  let current = 0;
  let cursor = activeDays.has(todayDay) ? todayDay : todayDay - 1;
  while (activeDays.has(cursor)) {
    current++;
    cursor--;
  }

  // Longest streak: scan sorted unique days for the longest consecutive run.
  const sorted = Array.from(activeDays).sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  return { current, longest };
}

export async function validateUsername(username: string): Promise<boolean> {
  try {
    const data = await fetchLeetcodeStats(username.trim());
    return !!data?.matchedUser;
  } catch (error) {
    return false;
  }
}

// In-process throttle: avoid duplicate concurrent syncs for the same user.
const inflightSyncs = new Map<string, Promise<any>>();

// How long a fresh sync is considered "hot" before we'll hit LeetCode again.
const SYNC_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export interface SyncOptions {
  /** Skip the sync entirely if a recent one already happened. */
  force?: boolean;
}

export const LEETCODE_USERNAME_TAKEN_MESSAGE =
  "That LeetCode username is already linked to another LeetRun account.";

async function assertUsernameAvailableForUser(userId: string, username: string) {
  const takenByOther = await db.leetcodeProfile.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { userId },
    },
    select: { userId: true },
  });

  if (takenByOther) {
    throw new Error(LEETCODE_USERNAME_TAKEN_MESSAGE);
  }
}

export async function syncUserProfile(
  userId: string,
  username: string,
  options: SyncOptions = {}
) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    throw new Error("LeetCode username is required.");
  }

  // De-dupe concurrent calls for the same user.
  const inflight = inflightSyncs.get(userId);
  if (inflight) return inflight;

  const job = (async () => {
    // LeetCode usernames are globally unique in our DB. This must live in the
    // shared sync path because onboarding calls /api/leetcode/sync directly.
    await assertUsernameAvailableForUser(userId, trimmedUsername);

    // 1. Cooldown short-circuit - return whatever's in the DB without hitting LeetCode.
    if (!options.force) {
      const existing = await db.leetcodeProfile.findUnique({
        where: { userId },
      });
      if (
        existing &&
        existing.syncedAt &&
        Date.now() - existing.syncedAt.getTime() < SYNC_COOLDOWN_MS
      ) {
        return existing;
      }
    }

    // 2. Hit LeetCode for stats, contest ranking, and recent submissions IN PARALLEL.
    const [statsData, contestSettled, subsSettled] = await Promise.all([
      fetchLeetcodeStats(trimmedUsername),
      fetchContestRanking(trimmedUsername).catch((err) => {
        console.warn("Failed to fetch contest ranking, skipping rating:", err);
        return null;
      }),
      fetchRecentSubmissions(trimmedUsername, 20).catch((err) => {
        console.warn("Failed to fetch recent submissions:", err);
        return null;
      }),
    ]);

    if (!statsData || !statsData.matchedUser) {
      throw new Error(`LeetCode user ${trimmedUsername} not found.`);
    }

    const contestRating: number | null =
      contestSettled?.userContestRanking?.rating ?? null;
    const recentSubmissions: any[] = subsSettled?.recentAcSubmissionList || [];

    return runSyncWrites(userId, trimmedUsername, statsData, contestRating, recentSubmissions);
  })();

  inflightSyncs.set(userId, job);
  try {
    return await job;
  } finally {
    inflightSyncs.delete(userId);
  }
}

async function runSyncWrites(
  userId: string,
  trimmedUsername: string,
  statsData: any,
  contestRating: number | null,
  recentSubmissions: any[]
) {

  const matchedUser = statsData.matchedUser;
  const profileStats = matchedUser.submitStats?.acSubmissionNum || [];
  const ranking = matchedUser.profile?.ranking || null;
  const reputation = matchedUser.profile?.reputation || null;
  const submissionCalendar = matchedUser.userCalendar?.submissionCalendar || null;
  const languageStats = matchedUser.languageProblemCount || [];

  // Extract solved stats
  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  profileStats.forEach((item: any) => {
    const count = item.count || 0;
    if (item.difficulty === "All") totalSolved = count;
    else if (item.difficulty === "Easy") easySolved = count;
    else if (item.difficulty === "Medium") mediumSolved = count;
    else if (item.difficulty === "Hard") hardSolved = count;
  });

  // Calculate overall acceptance rate
  const allSub = profileStats.find((i: any) => i.difficulty === "All");
  const acceptanceRate = allSub && allSub.submissions > 0 
    ? (allSub.count / allSub.submissions) * 100 
    : null;

  // 4. Update database records
  const profileResult = await db.$transaction(async (tx) => {
    // Sync LeetcodeProfile
    const profile = await tx.leetcodeProfile.upsert({
      where: { userId },
      update: {
        username: trimmedUsername,
        ranking,
        reputation,
        contestRating,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        acceptanceRate,
        submissionCalendar,
        syncedAt: new Date(),
      },
      create: {
        userId,
        username: trimmedUsername,
        ranking,
        reputation,
        contestRating,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        acceptanceRate,
        submissionCalendar,
        syncedAt: new Date(),
      },
    });

    // Sync languageStats
    await tx.leetcodeLanguageStat.deleteMany({
      where: { profileId: profile.id },
    });

    if (languageStats.length > 0) {
      await tx.leetcodeLanguageStat.createMany({
        data: languageStats.map((item: any) => ({
          profileId: profile.id,
          language: item.languageName,
          solved: item.problemsSolved,
        })),
      });
    }

    return profile;
  });

  // ---- Submissions: bulk insert in one go, skipping duplicates ----
  if (recentSubmissions.length > 0) {
    await db.leetcodeSubmission.createMany({
      data: recentSubmissions.map((sub: any) => {
        const topic = classifyTopic(sub.titleSlug);
        const guessedDifficulty =
          sub.titleSlug.length % 3 === 0
            ? "HARD"
            : sub.titleSlug.length % 2 === 0
            ? "MEDIUM"
            : "EASY";
        return {
          id: sub.id,
          profileId: profileResult.id,
          title: sub.title,
          slug: sub.titleSlug,
          difficulty: guessedDifficulty as any,
          topic,
          submittedAt: new Date(parseInt(sub.timestamp) * 1000),
        };
      }),
      skipDuplicates: true,
    });
  }

  // ---- Topic performance: aggregate then batch upsert ----
  // Aggregate locally so each unique topic results in a single DB upsert.
  const topicDeltas = new Map<string, number>();
  for (const sub of recentSubmissions) {
    const topic = classifyTopic(sub.titleSlug);
    topicDeltas.set(topic, (topicDeltas.get(topic) || 0) + 1);
  }

  if (topicDeltas.size > 0) {
    const existingPerfs = await db.topicPerformance.findMany({
      where: { userId, topic: { in: Array.from(topicDeltas.keys()) } },
    });
    const existingByTopic = new Map(existingPerfs.map((p) => [p.topic, p]));

    await Promise.all(
      Array.from(topicDeltas.entries()).map(([topic, delta]) => {
        const perf = existingByTopic.get(topic);
        if (!perf) {
          return db.topicPerformance.create({
            data: {
              userId,
              topic,
              attempts: delta,
              solved: delta,
              failed: 0,
              confidenceScore: 0.5,
              masteryLevel: 0.1,
            },
          });
        }
        const newSolved = perf.solved + delta;
        const newAttempts = perf.attempts + delta;
        const confidenceScore = Math.min(1, newSolved / newAttempts);
        return db.topicPerformance.update({
          where: { userId_topic: { userId, topic } },
          data: {
            attempts: newAttempts,
            solved: newSolved,
            confidenceScore,
            masteryLevel: Math.min(1.0, confidenceScore * 1.2),
          },
        });
      })
    );
  }

  // ---- Compute weak/strong topics and update derived data IN PARALLEL ----
  const performances = await db.topicPerformance.findMany({
    where: { userId },
    orderBy: { confidenceScore: "asc" },
    select: { topic: true },
  });

  const weakestTopic = performances[0]?.topic || null;
  const strongestTopic = performances[performances.length - 1]?.topic || null;

  // ---- LeetCode activity streak (derived from the submission calendar) ----
  // The streak now reflects real LeetCode solving days rather than only
  // in-app quest completions, so daily LeetCode practice keeps it alive.
  const { current: lcStreak, longest: lcLongest } =
    computeStreakFromCalendar(submissionCalendar);
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { longestStreak: true },
  });
  await db.user.update({
    where: { id: userId },
    data: {
      currentStreak: lcStreak,
      longestStreak: Math.max(existingUser?.longestStreak || 0, lcLongest, lcStreak),
      lastStreakAt: lcStreak > 0 ? new Date() : null,
    },
  });

  // Fire UserStats upsert, the event log, badges, and points recalculation in parallel.
  // (Points recalc reads currentStreak, so it must run *after* the streak update above.)
  const { checkAndAwardBadges } = await import("../services/badges");
  const { recalculateUserUniversalPoints } = await import(
    "../services/progression"
  );

  await Promise.all([
    db.userStats.upsert({
      where: { userId },
      update: {
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        weakestTopic,
        strongestTopic,
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        weakestTopic,
        strongestTopic,
        lastSyncedAt: new Date(),
      },
    }),
    db.userEvent.create({
      data: {
        userId,
        eventType: "LEETCODE_SYNC",
        metadata: {
          username: trimmedUsername,
          totalSolved,
          ranking,
        },
      },
    }),
    checkAndAwardBadges(userId).catch((err) => {
      console.error("Failed to evaluate badges during sync:", err);
    }),
    recalculateUserUniversalPoints(userId).catch((err) => {
      console.error("Failed to recalculate universal points during sync:", err);
    }),
  ]);

  return profileResult;
}
