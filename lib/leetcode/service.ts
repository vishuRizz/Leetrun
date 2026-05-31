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

export async function syncUserProfile(userId: string, username: string) {
  const trimmedUsername = username.trim();
  
  // 1. Fetch LeetCode progress stats
  const statsData = await fetchLeetcodeStats(trimmedUsername);
  if (!statsData || !statsData.matchedUser) {
    throw new Error(`LeetCode user ${trimmedUsername} not found.`);
  }

  // 2. Fetch contest ranking details
  let contestRating: number | null = null;
  try {
    const contestData = await fetchContestRanking(trimmedUsername);
    if (contestData?.userContestRanking) {
      contestRating = contestData.userContestRanking.rating;
    }
  } catch (err) {
    console.warn("Failed to fetch contest ranking, skipping rating:", err);
  }

  // 3. Fetch recent submissions
  let recentSubmissions: any[] = [];
  try {
    const subsData = await fetchRecentSubmissions(trimmedUsername, 20);
    if (subsData?.recentAcSubmissionList) {
      recentSubmissions = subsData.recentAcSubmissionList;
    }
  } catch (err) {
    console.warn("Failed to fetch recent submissions:", err);
  }

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

  // Save recent submissions and update topic performance outside transaction to avoid timeouts
  for (const sub of recentSubmissions) {
    const topic = classifyTopic(sub.titleSlug);
    const guessedDifficulty = sub.titleSlug.length % 3 === 0 ? "HARD" : sub.titleSlug.length % 2 === 0 ? "MEDIUM" : "EASY";

    // Save submission
    await db.leetcodeSubmission.upsert({
      where: { id: sub.id },
      update: {},
      create: {
        id: sub.id,
        profileId: profileResult.id,
        title: sub.title,
        slug: sub.titleSlug,
        difficulty: guessedDifficulty,
        topic,
        submittedAt: new Date(parseInt(sub.timestamp) * 1000),
      },
    });

    // Update TopicPerformance
    const performance = await db.topicPerformance.findUnique({
      where: {
        userId_topic: {
          userId,
          topic,
        },
      },
    });

    if (!performance) {
      await db.topicPerformance.create({
        data: {
          userId,
          topic,
          attempts: 1,
          solved: 1,
          failed: 0,
          confidenceScore: 0.5,
          masteryLevel: 0.1,
        },
      });
    } else {
      const newSolved = performance.solved + 1;
      const newAttempts = performance.attempts + 1;
      const confidenceScore = Math.min(1, newSolved / newAttempts);
      await db.topicPerformance.update({
        where: {
          userId_topic: {
            userId,
            topic,
          },
        },
        data: {
          attempts: newAttempts,
          solved: newSolved,
          confidenceScore,
          masteryLevel: Math.min(1.0, confidenceScore * 1.2),
        },
      });
    }
  }

  // Extract weak/strong topics based on updated performance
  const performances = await db.topicPerformance.findMany({
    where: { userId },
    orderBy: { confidenceScore: "asc" },
  });

  const weakestTopic = performances[0]?.topic || null;
  const strongestTopic = performances[performances.length - 1]?.topic || null;

  // Update UserStats cached stats
  await db.userStats.upsert({
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
  });

  // Logging event
  await db.userEvent.create({
    data: {
      userId,
      eventType: "LEETCODE_SYNC",
      metadata: {
        username: trimmedUsername,
        totalSolved,
        ranking,
      },
    },
  });

  // Automatically check and award achievements/badges after successful sync
  const { checkAndAwardBadges } = await import("../services/badges");
  await checkAndAwardBadges(userId).catch((err) => {
    console.error("Failed to evaluate badges during sync:", err);
  });

  // Recalculate universal competency points
  const { recalculateUserUniversalPoints } = await import("../services/progression");
  await recalculateUserUniversalPoints(userId).catch((err) => {
    console.error("Failed to recalculate universal points during sync:", err);
  });

  return profileResult;
}
