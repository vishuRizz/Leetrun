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

export async function syncUserProfile(
  userId: string,
  username: string,
  options: SyncOptions = {}
) {
  const trimmedUsername = username.trim();

  // De-dupe concurrent calls for the same user.
  const inflight = inflightSyncs.get(userId);
  if (inflight) return inflight;

  const job = (async () => {
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

  // Fire UserStats upsert, the event log, badges, and points recalculation in parallel.
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
